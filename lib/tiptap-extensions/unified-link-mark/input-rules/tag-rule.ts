/**
 * Tag InputRule (#タグ)
 * Handles #tag notation for creating unified links
 */

import type { Editor } from "@tiptap/core";
import { InputRule } from "@tiptap/core";
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
	const timestamp = new Date().toISOString().split("T")[1];
	const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
	console.error(`[${timestamp}] [TagRule-DEBUG] [${context}] ${message}${dataStr}`);
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

			// CRITICAL: Check if the range already has this mark
			// This is the key prevention for duplicate marks
			let hasExistingMark = false;
			state.doc.nodesBetween(from, to, (node) => {
				if (node.isText && node.marks.some((m) => m.type === markType)) {
					hasExistingMark = true;
					return false; // Stop traversal
				}
			});

			if (hasExistingMark) {
				debugLog("SKIP", "mark already exists on this range", { from, to });
				return;
			}

			const raw = match[1];
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

