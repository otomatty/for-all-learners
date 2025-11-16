/**
 * Bracket InputRule ([Title])
 * Handles [Title] notation for creating unified links
 */

import type { Editor } from "@tiptap/core";
import { InputRule } from "@tiptap/core";
import logger from "../../../logger";
import { normalizeTitleToKey } from "../../../unilink";
import { PATTERNS } from "../config";
import { generateMarkId } from "../state-manager";
import type { UnifiedLinkAttributes } from "../types";
import { isInCodeContext } from "./utils";

// Debug flag
const DEBUG_BRACKET_RULE = true;

// Track processed matches to prevent duplication
// Maps "content:from:to" to timestamp of last processing
const processedMatches = new Map<string, number>();
const MATCH_DEDUP_WINDOW = 100; // ms - prevent same match within this window

/**
 * Create the bracket InputRule
 * @param _context - InputRule context (unused - simplified implementation)
 * @returns InputRule instance
 */
export function createBracketInputRule(_context: {
	editor: Editor;
	name: string;
}) {
	return new InputRule({
		find: PATTERNS.bracket,
		handler: ({ state, match, range, chain }) => {
			if (DEBUG_BRACKET_RULE) {
				const matchText = state.doc.textBetween(range.from, range.to);
				logger.debug(
					{
						match: match[0],
						captured: match[1],
						range,
						rangeText: matchText,
						matchIndex: match.index,
					},
					"[BracketInputRule] Handler triggered",
				);
			}

			// Check if the matched range already has a unilink mark
			// If it does, skip processing to prevent re-processing already marked content
			// Note: range.from and range.to already include the full bracket notation [text]
			const hasUnilinkMark = state.doc.rangeHasMark(
				range.from,
				range.to,
				state.schema.marks.unilink,
			);

			if (hasUnilinkMark) {
				if (DEBUG_BRACKET_RULE) {
					logger.debug(
						{ range },
						"[BracketInputRule] Suppressed: unilink mark already exists in range",
					);
				}
				return null;
			}

			// Suppress in code context
			if (isInCodeContext(state)) {
				if (DEBUG_BRACKET_RULE) {
					logger.debug(
						{},
						"[BracketInputRule] Suppressed: code context detected",
					);
				}
				return null;
			}

			const raw = match[1];
			const text = raw;
			const key = normalizeTitleToKey(raw);
			const markId = generateMarkId();

			// Check if external link
			const isExternal = PATTERNS.externalUrl.test(raw);

			// Note: InputRule range.from and range.to already include the full bracket notation [text]
			const { from, to } = range;

			if (DEBUG_BRACKET_RULE) {
				logger.debug(
					{ raw, key, markId, isExternal, from, to },
					"[BracketInputRule] Processing match",
				);
			}

			// Deduplication check: prevent processing same match within window
			const matchKey = `${raw}:${from}:${to}`;
			const now = Date.now();
			const lastProcessed = processedMatches.get(matchKey);

			if (
				lastProcessed !== undefined &&
				now - lastProcessed < MATCH_DEDUP_WINDOW
			) {
				if (DEBUG_BRACKET_RULE) {
					logger.warn(
						{ matchKey, timeSinceLastProcess: now - lastProcessed },
						"[BracketInputRule] ⚠️ Duplicate match detected within dedup window, skipping",
					);
				}
				return null;
			}

			// Record this match as processed
			processedMatches.set(matchKey, now);

			if (DEBUG_BRACKET_RULE) {
				logger.debug(
					{ processedCount: processedMatches.size },
					"[BracketInputRule] ✅ Processing allowed, executing insertContent",
				);
			}

			// External URLs should use standard link mark instead of unilink mark
			if (isExternal) {
				if (DEBUG_BRACKET_RULE) {
					logger.debug(
						{
							deleteFrom: from,
							deleteTo: to,
							deleteText: state.doc.textBetween(from, to),
						},
						"[BracketInputRule] ℹ️ Applying link mark for external URL",
					);
				}
				// Apply link mark to the entire bracket notation [text] for consistency with bracket-monitor-plugin
				chain()
					.focus()
					.deleteRange({ from, to })
					.insertContent([
						{
							type: "text",
							text: "[",
						},
						{
							type: "text",
							text: text,
							marks: [
								{
									type: "link",
									attrs: {
										href: raw,
										target: "_blank",
									},
								},
							],
						},
						{
							type: "text",
							text: "]",
						},
					])
					.run();
				if (DEBUG_BRACKET_RULE) {
					logger.debug(
						{ text: `[${text}]`, href: raw },
						"[BracketInputRule] ✅ Link mark applied for external URL",
					);
				}
				return;
			}

			// Simple link creation: bracket = link, no async resolution needed
			const attrs: UnifiedLinkAttributes = {
				variant: "bracket",
				raw,
				text,
				key,
				pageId: null,
				href: `#${key}`, // Use key as href for internal links
				state: "exists", // Always exists - bracket presence defines link status
				exists: true,
				markId,
			};

			// Apply mark to the ENTIRE bracket notation including [ and ]
			// This prevents the InputRule from re-matching when cursor moves outside
			if (DEBUG_BRACKET_RULE) {
				logger.debug(
					{
						deleteFrom: from,
						deleteTo: to,
						deleteText: state.doc.textBetween(from, to),
					},
					"[BracketInputRule] ℹ️ Applying mark to entire bracket notation",
				);
			}
			// Use array form for insertContent to simplify and improve readability
			chain()
				.focus()
				.deleteRange({ from, to })
				.insertContent([
					{
						type: "text",
						text: "[",
					},
					{
						type: "text",
						text: text,
						marks: [
							{
								type: "unilink",
								attrs,
							},
						],
					},
					{
						type: "text",
						text: "]",
					},
				])
				.run();
			if (DEBUG_BRACKET_RULE) {
				logger.debug(
					{ markId, text: `[${text}]`, href: attrs.href },
					"[BracketInputRule] ✅ Mark applied to entire bracket notation (including brackets)",
				);
			} // No async resolution needed - bracket presence is sufficient
		},
	});
}
