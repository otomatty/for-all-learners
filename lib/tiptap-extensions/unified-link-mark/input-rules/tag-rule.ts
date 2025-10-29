/**
 * Tag InputRule (#タグ)
 * Handles #tag notation for creating unified links
 */

import type { Editor } from "@tiptap/core";
import { InputRule } from "@tiptap/core";
import logger from "../../../logger";
import { normalizeTitleToKey } from "../../../unilink";
import { PATTERNS } from "../config";
import { enqueueResolve } from "../resolver-queue";
import { generateMarkId } from "../state-manager";
import type { UnifiedLinkAttributes } from "../types";
import { isInCodeContext } from "./utils";

// Debug flag - enable to see detailed duplication detection logs
const DEBUG_TAG_DUPLICATION = false;

// Track InputRule calls for debugging
let inputRuleCallCount = 0;

function debugLog(
	context: string,
	message: string,
	data?: Record<string, unknown>,
) {
	if (!DEBUG_TAG_DUPLICATION) return;
	logger.debug(data || {}, `[TagRule-DEBUG] [${context}] ${message}`);
}

/**
 * Create the tag InputRule
 * @param context - InputRule context
 * @returns InputRule instance
 */
export function createTagInputRule(context: { editor: Editor; name: string }) {
	return new InputRule({
		find: PATTERNS.tag,
		handler: ({ state, match, range, chain }) => {
			inputRuleCallCount++;
			const { from, to } = range;

			debugLog("CALL", `Call #${inputRuleCallCount}`, {
				match: match[0],
				range: { from, to },
			});

			// Suppress in code context
			if (isInCodeContext(state)) {
				debugLog("SKIP", "in code context");
				return;
			}

			// PRIMARY CHECK: Verify that the mark type exists
			const markType = state.schema.marks.unilink;
			if (!markType) {
				debugLog("SKIP", "unilink mark type not found in schema");
				return;
			}

			// Extract the raw tag text first
			const raw = match[1];

			// CRITICAL: Check if the range already has this mark
			// If a mark exists, compare lengths and replace if new match is longer
			type ExistingMarkInfo = { from: number; to: number; raw: string };
			let existingMarkInfo: ExistingMarkInfo | null = null;
			state.doc.nodesBetween(from, to, (node, pos) => {
				if (node.isText && node.marks.some((m) => m.type === markType)) {
					const mark = node.marks.find((m) => m.type === markType);
					if (mark) {
						existingMarkInfo = {
							from: pos,
							to: pos + node.nodeSize,
							raw: mark.attrs.raw || "",
						};
						return false; // Stop traversal
					}
				}
			});

			if (existingMarkInfo !== null) {
				const newLength = raw.length;
				// Type assertion to satisfy TypeScript
				const existingInfo: ExistingMarkInfo = existingMarkInfo;
				const existingLength = existingInfo.raw.length;

				if (newLength <= existingLength) {
					// New match is same or shorter - skip to prevent unnecessary updates
					debugLog("SKIP", "existing mark is same or longer", {
						existing: existingInfo,
						newRaw: raw,
						newLength,
						existingLength,
					});
					return;
				}

				// New match is longer - update the mark in place
				debugLog("REPLACE", "replacing shorter mark with longer one", {
					existing: existingInfo,
					newRaw: raw,
					newLength,
					existingLength,
				});

				// Generate new attributes for the longer tag
				const text = `#${raw}`;
				const key = normalizeTitleToKey(raw);
				const markId = generateMarkId();

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

				// Replace the entire range (old mark + new characters) with the new mark
				chain()
					.focus()
					.deleteRange({ from, to })
					.insertContent({
						type: "text",
						text: text,
						marks: [
							{
								type: "unilink",
								attrs,
							},
						],
					})
					.run();

				debugLog("COMPLETE", "mark replaced", { text, markId });

				// Enqueue for resolution
				queueMicrotask(() => {
					enqueueResolve({
						key,
						raw,
						markId,
						variant: "tag",
						editor: context.editor,
					});
				});

				return; // Exit early after replacement
			}
			const text = `#${raw}`;
			const key = normalizeTitleToKey(raw);
			const markId = generateMarkId();
			debugLog("PROCESS", "applying mark", { raw, text, range: { from, to } });
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

			chain()
				.focus()
				.deleteRange({ from, to })
				.insertContent({
					type: "text",
					text: text,
					marks: [
						{
							type: "unilink",
							attrs,
						},
					],
				})
				.run();

			debugLog("COMPLETE", "mark applied", { text, markId });

			// Enqueue for resolution
			// Add a microtask delay to ensure the mark is in the document
			queueMicrotask(() => {
				enqueueResolve({
					key,
					raw,
					markId,
					editor: context.editor,
					variant: "tag",
				});
			});
		},
	});
}
