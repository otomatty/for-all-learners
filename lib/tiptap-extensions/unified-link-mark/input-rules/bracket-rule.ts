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

// Track processed matches to prevent duplicates
let processedBracketMatches = new Set<string>();

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
			// Create a unique identifier for this match (key + position)
			const matchId = `${raw}:${range.from}:${range.to}`;

			// Check if we've already processed this exact match
			if (processedBracketMatches.has(matchId)) {
				return null;
			}

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

		// Mark this match as processed to prevent future duplicates
		processedBracketMatches.add(matchId);

		// Enqueue for resolution if not external
		if (!isExternal) {
			logger.debug(
					{ key, raw, markId, variant: "bracket" },
					"[BracketInputRule] Enqueueing resolve for bracket link",
				);
				enqueueResolve({
					key,
					raw, // Pass original text for flexible search
					markId,
					editor: context.editor,
					variant: "bracket",
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
