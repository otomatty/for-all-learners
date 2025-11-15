/**
 * Bracket Monitor Plugin
 * Monitors bracket notation ([text]) and maintains link marks in real-time
 *
 * Key behavior:
 * - Detects complete brackets [text] (both [ and ] present)
 * - Creates link marks immediately when closing bracket ] is typed
 * - Updates link attributes when text changes inside closed brackets
 * - Removes link marks when brackets become incomplete
 * - Reuses markId to prevent unnecessary resolution queue additions
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを使用している場所):
 *   └─ lib/tiptap-extensions/unified-link-mark/plugins/index.ts
 *
 * Dependencies (このファイルが使用している外部ファイル):
 *   ├─ @tiptap/core (Editor)
 *   ├─ @tiptap/pm/state (Plugin, PluginKey, EditorState, Transaction)
 *   ├─ lib/logger
 *   ├─ lib/unilink (normalizeTitleToKey)
 *   ├─ ../config (PATTERNS)
 *   ├─ ../resolver-queue (enqueueResolve)
 *   ├─ ../state-manager (generateMarkId)
 *   └─ ../types (UnifiedLinkAttributes)
 *
 * Related Files:
 *   ├─ Tests: __tests__/bracket-monitor-plugin.test.ts
 *   ├─ Reference: tag-monitor-plugin.ts (similar architecture)
 *   └─ Plan: docs/03_plans/bracket-realtime-linking/20251026_01_bracket-monitor-implementation-plan.md
 */

import type { Editor } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import logger from "../../../logger";
import { normalizeTitleToKey } from "../../../unilink";
import { PATTERNS } from "../config";
import { enqueueResolve } from "../resolver-queue";
import { generateMarkId } from "../state-manager";
import type { UnifiedLinkAttributes } from "../types";

const DEBUG = true; // Temporarily enabled for debugging

function debugLog(
	context: string,
	message: string,
	data?: Record<string, unknown>,
) {
	if (!DEBUG) return;
	logger.debug(data || {}, `[BracketMonitor] [${context}] ${message}`);
}

export const bracketMonitorPluginKey = new PluginKey("bracket-monitor");

/**
 * Find all complete bracket patterns in the document
 * Returns array of { from, to, raw } for each complete bracket found
 *
 * Detection rules:
 * - Must have both [ and ]
 * - Content between brackets must not contain [ or ]
 * - Content must not contain newlines
 * - Content must not be empty
 */
function findCompleteBracketsInDoc(
	state: EditorState,
): Array<{ from: number; to: number; raw: string }> {
	const brackets: Array<{ from: number; to: number; raw: string }> = [];
	const markType = state.schema.marks.unilink;

	if (!markType) return brackets;

	// Scan through the entire document
	state.doc.descendants((node, pos) => {
		if (!node.isText || !node.text) return;

		// Skip if this text node is inside a codeBlock
		const $pos = state.doc.resolve(pos);
		if ($pos.parent.type.name === "codeBlock") {
			return;
		}

		const text = node.text;

		// Pattern: [text] where text doesn't contain brackets or newlines
		const bracketPattern = /\[([^[\]\n]+)\]/g;
		const matches = text.matchAll(bracketPattern);

		for (const match of matches) {
			if (match.index === undefined) continue;
			const matchStart = match.index;
			const matchEnd = matchStart + match[0].length;
			const raw = match[1];

			// Skip empty brackets
			if (!raw || raw.trim().length === 0) {
				continue;
			}

			brackets.push({
				from: pos + matchStart,
				to: pos + matchEnd,
				raw,
			});

			debugLog("FOUND", "detected complete bracket", {
				from: pos + matchStart,
				to: pos + matchEnd,
				raw,
			});
		}
	});

	return brackets;
}

/**
 * Find existing bracket marks in the document
 * Returns array of { from, to, raw, markId } for each existing bracket mark
 */
function findExistingBracketMarks(
	state: EditorState,
): Array<{ from: number; to: number; raw: string; markId: string }> {
	const marks: Array<{
		from: number;
		to: number;
		raw: string;
		markId: string;
	}> = [];
	const markType = state.schema.marks.unilink;

	if (!markType) return marks;

	state.doc.descendants((node, pos) => {
		if (!node.isText) return;

		// Skip if this text node is inside a codeBlock
		const $pos = state.doc.resolve(pos);
		if ($pos.parent.type.name === "codeBlock") {
			return;
		}

		// Filter marks with variant="bracket"
		const bracketMarks = node.marks.filter(
			(m) => m.type === markType && m.attrs.variant === "bracket",
		);

		for (const mark of bracketMarks) {
			marks.push({
				from: pos,
				to: pos + (node.text?.length || 0),
				raw: mark.attrs.raw,
				markId: mark.attrs.markId,
			});

			debugLog("EXISTING", "found existing bracket mark", {
				from: pos,
				to: pos + (node.text?.length || 0),
				raw: mark.attrs.raw,
				markId: mark.attrs.markId,
			});
		}
	});

	return marks;
}

/**
 * Check if a bracket needs to be updated
 * Returns true if the mark doesn't exist or if the raw content has changed
 */
function checkIfNeedsUpdate(
	state: EditorState,
	bracket: { from: number; to: number; raw: string },
): boolean {
	const markType = state.schema.marks.unilink;
	if (!markType) return true;

	// Check if this range already has a bracket mark with the same raw
	let existingRaw: string | undefined;

	state.doc.nodesBetween(bracket.from, bracket.to, (node) => {
		if (node.isText) {
			const bracketMark = node.marks.find(
				(m) => m.type === markType && m.attrs.variant === "bracket",
			);
			if (bracketMark) {
				existingRaw = bracketMark.attrs.raw;
				return false; // Stop searching
			}
		}
	});

	// Mark doesn't exist or raw has changed
	const needsUpdate = !existingRaw || existingRaw !== bracket.raw;

	if (needsUpdate) {
		debugLog("UPDATE", "mark needs update", {
			from: bracket.from,
			to: bracket.to,
			existingRaw,
			newRaw: bracket.raw,
		});
	}

	return needsUpdate;
}

/**
 * Apply or update bracket mark
 * Reuses existing markId if available to prevent unnecessary resolution queue additions
 */
function applyBracketMark(
	tr: Transaction,
	editor: Editor,
	from: number,
	to: number,
	raw: string,
): Transaction {
	const markType = tr.doc.type.schema.marks.unilink;
	if (!markType) return tr;

	const text = raw;
	const key = normalizeTitleToKey(raw);

	// Check if we should reuse existing markId
	let existingMarkId: string | undefined;
	let existingRaw: string | undefined;

	try {
		tr.doc.nodesBetween(from, to, (node) => {
			if (node.isText) {
				const bracketMark = node.marks.find(
					(m) => m.type === markType && m.attrs.variant === "bracket",
				);
				if (bracketMark) {
					existingMarkId = bracketMark.attrs.markId;
					existingRaw = bracketMark.attrs.raw;
					return false; // Stop searching
				}
			}
		});
	} catch (error) {
		debugLog("ERROR", "failed to check existing marks", { from, to, error });
	}

	const markId = existingMarkId || generateMarkId();
	const hasTextChanged = existingRaw !== raw;

	// Check if this is an external URL (starts with http:// or https://)
	const isExternal = PATTERNS.externalUrl.test(raw);

	const attrs: UnifiedLinkAttributes = {
		variant: "bracket",
		raw,
		text,
		key,
		pageId: null,
		href: isExternal ? raw : `#${key}`,
		state: "pending", // Always pending for closed brackets
		exists: false,
		markId,
	};

	debugLog("APPLY", "applying bracket mark", {
		from,
		to,
		raw,
		markId,
		isExternal,
		reusingMarkId: !!existingMarkId,
		hasTextChanged,
	});

	// Remove any existing unilink marks in this range
	tr.removeMark(from, to, markType);

	// Add the new mark
	tr.addMark(from, to, markType.create(attrs));

	// Enqueue for resolution if:
	// 1. markId is new, OR
	// 2. text content has changed (requires re-resolution)
	if (!existingMarkId || hasTextChanged) {
		debugLog("QUEUE", "enqueueing resolution", {
			key,
			raw,
			markId,
			reason: !existingMarkId ? "new markId" : "text changed",
		});
		queueMicrotask(() => {
			enqueueResolve({
				key,
				raw,
				markId,
				variant: "bracket",
				editor,
			});
		});
	} else {
		debugLog("SKIP_QUEUE", "reusing existing markId, text unchanged", {
			markId,
		});
	}

	return tr;
}

/**
 * Create the bracket monitor plugin
 */
export function createBracketMonitorPlugin(editor: Editor) {
	return new Plugin({
		key: bracketMonitorPluginKey,

		appendTransaction(transactions, _oldState, newState) {
			// CRITICAL: Skip our own transactions to prevent infinite loop
			const isOwnTransaction = transactions.some((tr) =>
				tr.getMeta(bracketMonitorPluginKey),
			);
			if (isOwnTransaction) {
				debugLog("SKIP", "own transaction detected, preventing loop");
				return null;
			}

			// Skip if no document changes
			const docChanged = transactions.some((tr) => tr.docChanged);
			if (!docChanged) return null;

			debugLog("CHECK", "document changed, scanning for brackets");

			// Step 1: Find all complete brackets [text]
			const completeBrackets = findCompleteBracketsInDoc(newState);

			// Step 2: Find existing bracket marks
			const existingBracketMarks = findExistingBracketMarks(newState);

			if (completeBrackets.length === 0 && existingBracketMarks.length === 0) {
				debugLog("CHECK", "no brackets found");
				return null;
			}

			debugLog("FOUND", `found ${completeBrackets.length} complete brackets`, {
				completeBrackets,
			});
			debugLog("FOUND", `found ${existingBracketMarks.length} existing marks`, {
				existingBracketMarks,
			});

			let tr = newState.tr;
			let modified = false;

			// Step 3: Apply/update marks for complete brackets
			for (const bracket of completeBrackets) {
				const { from, to, raw } = bracket;

				// Check if this bracket needs update
				const needsUpdate = checkIfNeedsUpdate(newState, bracket);

				if (!needsUpdate) {
					// Mark exists and is correct - skip
					debugLog("SKIP", "bracket mark already correct", { from, to, raw });
					continue;
				}

				// Need to apply or update mark
				debugLog("APPLY", "applying bracket mark", { from, to, raw });
				tr = applyBracketMark(tr, editor, from, to, raw);
				modified = true;
			}

			// Step 4: Remove marks for incomplete brackets
			const markType = newState.schema.marks.unilink;
			if (markType) {
				for (const existingMark of existingBracketMarks) {
					// Check if this mark still corresponds to a complete bracket
					const stillComplete = completeBrackets.some(
						(b) => b.from === existingMark.from && b.to === existingMark.to,
					);

					if (!stillComplete) {
						// Check if this is a migrated/created mark (created: false)
						// These marks don't have surrounding brackets, so we shouldn't remove them
						let shouldPreserve = false;
						newState.doc.nodesBetween(
							existingMark.from,
							existingMark.to,
							(node) => {
								if (node.isText) {
									const mark = node.marks.find(
										(m) =>
											m.type === markType &&
											m.attrs.variant === "bracket" &&
											m.attrs.markId === existingMark.markId,
									);
									if (mark && mark.attrs.created === false) {
										shouldPreserve = true;
										debugLog(
											"PRESERVE",
											"preserving migrated/created mark (created=false)",
											{
												from: existingMark.from,
												to: existingMark.to,
												raw: existingMark.raw,
												markId: existingMark.markId,
											},
										);
										return false; // Stop searching
									}
								}
							},
						);

						if (!shouldPreserve) {
							// Bracket became incomplete - remove mark
							debugLog("REMOVE", "removing incomplete bracket mark", {
								from: existingMark.from,
								to: existingMark.to,
								raw: existingMark.raw,
							});
							tr.removeMark(existingMark.from, existingMark.to, markType);
							modified = true;
						}
					}
				}
			}

			if (!modified) return null;

			// Mark this transaction as coming from bracket monitor to prevent loop
			tr.setMeta(bracketMonitorPluginKey, true);

			return tr;
		},
	});
}
