/**
 * Tag Monitor Plugin
 * Monitors tag notation (#tag) and maintains link marks even during editing
 *
 * Key behavior:
 * - Treats any continuous text starting with # (without spaces) as a tag link
 * - Maintains link marks during character deletion/addition
 * - Updates mark attributes when tag text changes
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

const DEBUG = false;

function debugLog(
	context: string,
	message: string,
	data?: Record<string, unknown>,
) {
	if (!DEBUG) return;
	logger.debug(data || {}, `[TagMonitor] [${context}] ${message}`);
}

export const tagMonitorPluginKey = new PluginKey("tag-monitor");

/**
 * Find all tag patterns in the document
 * Returns array of { from, to, raw } for each tag found
 */
function findTagsInDoc(
	state: EditorState,
): Array<{ from: number; to: number; raw: string }> {
	const tags: Array<{ from: number; to: number; raw: string }> = [];
	const markType = state.schema.marks.unilink;

	if (!markType) return tags;

	// Scan through the entire document
	state.doc.descendants((node, pos) => {
		if (!node.isText || !node.text) return;

		const text = node.text;

		// Find all tags in this text node
		// Use a more permissive pattern: #followed by non-space characters
		const tagPattern = /#([^\s]+)/g;
		const matches = text.matchAll(tagPattern);

		for (const match of matches) {
			const matchStart = match.index;
			const matchEnd = matchStart + match[0].length;
			const raw = match[1];

			// Verify it matches our official tag pattern
			const fullMatch = match[0] + " "; // Add space for pattern matching
			if (PATTERNS.tag.test(fullMatch)) {
				tags.push({
					from: pos + matchStart,
					to: pos + matchEnd,
					raw,
				});
			}
		}
	});

	return tags;
}

/**
 * Apply or update tag mark
 */
function applyTagMark(
	tr: Transaction,
	editor: Editor,
	from: number,
	to: number,
	raw: string,
): Transaction {
	const markType = tr.doc.type.schema.marks.unilink;
	if (!markType) return tr;

	const text = `#${raw}`;
	const key = normalizeTitleToKey(raw);

	// Check if we should reuse existing markId by checking marks directly on the doc
	let existingMarkId: string | undefined;

	try {
		tr.doc.nodesBetween(from, to, (node) => {
			if (node.isText) {
				const tagMark = node.marks.find(
					(m) => m.type === markType && m.attrs.variant === "tag",
				);
				if (tagMark) {
					existingMarkId = tagMark.attrs.markId;
					return false; // Stop searching
				}
			}
		});
	} catch (error) {
		debugLog("ERROR", "failed to check existing marks", { from, to, error });
	}

	const markId = existingMarkId || generateMarkId();

	const attrs: UnifiedLinkAttributes = {
		variant: "tag",
		raw,
		text,
		key,
		pageId: null,
		href: "#",
		state: "pending",
		exists: false,
		markId,
	};

	debugLog("APPLY", "applying tag mark", { from, to, raw, markId });

	// Remove any existing unilink marks in this range
	tr.removeMark(from, to, markType);

	// Add the new mark
	tr.addMark(from, to, markType.create(attrs));

	// Enqueue for resolution
	queueMicrotask(() => {
		enqueueResolve({
			key,
			raw,
			markId,
			variant: "tag",
			editor,
		});
	});

	return tr;
}

/**
 * Create the tag monitor plugin
 */
export function createTagMonitorPlugin(editor: Editor) {
	return new Plugin({
		key: tagMonitorPluginKey,

		appendTransaction(transactions, _oldState, newState) {
			// CRITICAL: Skip our own transactions to prevent infinite loop
			const isOwnTransaction = transactions.some((tr) =>
				tr.getMeta(tagMonitorPluginKey),
			);
			if (isOwnTransaction) {
				debugLog("SKIP", "own transaction detected, preventing loop");
				return null;
			}

			// Skip if no document changes
			const docChanged = transactions.some((tr) => tr.docChanged);
			if (!docChanged) return null;

			debugLog("CHECK", "document changed, scanning for tags");

			// Find all tags in the document
			const tags = findTagsInDoc(newState);

			if (tags.length === 0) {
				debugLog("CHECK", "no tags found");
				return null;
			}

			debugLog("FOUND", `found ${tags.length} tags`, { tags });

			let tr = newState.tr;
			let modified = false;

			for (const tag of tags) {
				const { from, to, raw } = tag;

				// Check if this range already has the correct tag mark
				// We need to check the actual mark in the range, not just at 'from'
				let hasCorrectMark = false;
				const markType = newState.schema.marks.unilink;

				if (markType) {
					newState.doc.nodesBetween(from, to, (node) => {
						if (node.isText) {
							const tagMark = node.marks.find(
								(m) =>
									m.type === markType &&
									m.attrs.variant === "tag" &&
									m.attrs.raw === raw,
							);
							if (tagMark) {
								hasCorrectMark = true;
								return false; // Stop searching
							}
						}
					});
				}

				if (hasCorrectMark) {
					// Mark exists and is correct - skip
					debugLog("SKIP", "tag mark already correct", { from, to, raw });
					continue;
				}

				// Need to apply or update mark
				debugLog("APPLY", "applying tag mark", { from, to, raw });
				tr = applyTagMark(tr, editor, from, to, raw);
				modified = true;
			}

			if (!modified) return null;

			// Mark this transaction as coming from tag monitor to prevent loop
			tr.setMeta(tagMonitorPluginKey, true);

			return tr;
		},
	});
}
