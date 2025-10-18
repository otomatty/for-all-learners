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

// Debug flag
const DEBUG_TAG_DUPLICATION = true;

function debugLog(
	context: string,
	message: string,
	data?: Record<string, unknown>,
) {
	if (!DEBUG_TAG_DUPLICATION) return;
	const timestamp = new Date().toISOString().split("T")[1];
	const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
	console.log(`[${timestamp}] [TagRule] [${context}] ${message}${dataStr}`);
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
			debugLog("handler", "Tag InputRule triggered", {
				match: match[0],
				raw: match[1],
				range,
			});

			// Suppress in code context
			if (isInCodeContext(state)) {
				debugLog("handler", "Skipping: in code context");
				return null;
			}

			const raw = match[1];
			const text = `#${raw}`; // Tag displays with # prefix
			const key = normalizeTitleToKey(raw);
			const markId = generateMarkId();

			debugLog("handler", "Processing tag", {
				raw,
				text,
				key,
			});

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

			const { from, to } = range;

			debugLog("handler", "Executing chain operations", {
				from,
				to,
				deleteRange: `${from}-${to}`,
			});

			// Apply mark using chain API
			chain()
				.focus()
				.deleteRange({ from, to })
				.insertContent({
					type: "text",
					text: text,
					marks: [
						{
							type: context.name,
							attrs,
						},
					],
				})
				.run();

			debugLog("handler", "Chain operations completed");

			// Enqueue for resolution
			enqueueResolve({
				key,
				raw, // Pass original text for flexible search
				markId,
				editor: context.editor,
				variant: "tag",
			});
		},
	});
}

