/**
 * Bracket InputRule ([Title])
 * Handles [Title] notation for creating unified links
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

// Debug flag
const DEBUG_BRACKET_RULE = false;

/**
 * Create the bracket InputRule
 * @param context - InputRule context
 * @returns InputRule instance
 */
export function createBracketInputRule(context: {
	editor: Editor;
	name: string;
}) {
	return new InputRule({
		find: PATTERNS.bracket,
		handler: ({ state, match, range, chain }) => {
			// Suppress in code context
			if (isInCodeContext(state)) {
				return null;
			}

			const raw = match[1];
			const text = raw;
			const key = normalizeTitleToKey(raw);
			const markId = generateMarkId();

			// Check if external link
			const isExternal = PATTERNS.externalUrl.test(raw);

			const { from, to } = range;

			const attrs: UnifiedLinkAttributes = {
				variant: "bracket",
				raw,
				text,
				key,
				pageId: null,
				href: isExternal ? raw : "#",
				state: isExternal ? "exists" : "pending",
				exists: isExternal,
				markId,
			};

			// Apply mark using chain API
			// Keep brackets as text around the marked content
			// This ensures proper text flow and prevents corruption
			chain()
				.focus()
				.deleteRange({ from, to })
				.insertContent({
					type: "text",
					text: "[",
				})
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
				.insertContent({
					type: "text",
					text: "]",
				})
				.run();

			// Enqueue for resolution if not external
			if (!isExternal) {
				logger.debug(
					{ key, raw, markId, variant: "bracket" },
					"[BracketInputRule] Enqueueing resolve for bracket link",
				);
				queueMicrotask(() => {
					enqueueResolve({
						key,
						raw, // Pass original text for flexible search
						markId,
						editor: context.editor,
						variant: "bracket",
					});
				});
			} else {
				logger.debug(
					{ raw, markId },
					"[BracketInputRule] External link detected, skipping resolution",
				);
			}
		},
	});
}
