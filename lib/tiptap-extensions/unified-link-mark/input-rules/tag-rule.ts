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

/**
 * Create the tag InputRule
 * @param context - InputRule context
 * @returns InputRule instance
 */
export function createTagInputRule(context: { editor: Editor; name: string }) {
	return new InputRule({
		find: PATTERNS.tag,
		handler: ({ state, match, range, chain }) => {
			// Suppress in code context
			if (isInCodeContext(state)) {
				return null;
			}

			const raw = match[1];
			const text = `#${raw}`; // Tag displays with # prefix
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

			const { from, to } = range;

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
