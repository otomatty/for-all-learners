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
const DEBUG_TAG_DUPLICATION = false;

// Track InputRule calls for debugging
let inputRuleCallCount = 0;

// Track processed matches to prevent duplicates
let lastProcessedKey = "";
let processedMatches = new Set<string>();

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
			inputRuleCallCount++;
			const currentTime = Date.now();
			const currentKey = match[1]; // The key part of the tag (without #)
			const currentMatch = match[0]; // Full match including #

			// Create a unique identifier for this match (key + position)
			const matchId = `${currentKey}:${range.from}:${range.to}`;

			// Check if we've already processed this exact match
			const isDuplicate = processedMatches.has(matchId);

			debugLog("handler", `Tag InputRule triggered (call #${inputRuleCallCount})`, {
				match: currentMatch,
				raw: currentKey,
				range,
				isDuplicate,
				matchId,
			});

			// Skip if this is a duplicate match
			if (isDuplicate) {
				debugLog("handler", `Skipping duplicate: ${matchId}`);
				return null;
			}

			// Suppress in code context
			if (isInCodeContext(state)) {
				debugLog("handler", "Skipping: in code context");
				return null;
			}

			// Check if the matched text already has UnifiedLink mark
			// This prevents double processing when InputRule triggers multiple times
			const { from, to } = range;
			const markType = state.schema.marks.unifiedLink;
			let hasUnifiedLinkMark = false;

			if (markType) {
				state.doc.nodesBetween(Math.max(0, from - 1), Math.min(state.doc.content.size, to + 1), (node) => {
					if (node.marks.some((mark) => mark.type === markType)) {
						hasUnifiedLinkMark = true;
						return false; // Stop traversal
					}
				});
			}

			if (hasUnifiedLinkMark) {
				debugLog("handler", "Skipping: text already has UnifiedLink mark (prevents double processing)");
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

		const rangeFrom = range.from;
		const rangeTo = range.to;

		// Debug: Log the state before deletion
		const stateBefore = state.doc.textBetween(Math.max(0, rangeFrom - 2), Math.min(state.doc.content.size, rangeTo + 2));
		debugLog("handler", "State before deletion", {
			from: rangeFrom,
			to: rangeTo,
			stateBefore: `"${stateBefore}"`,
			matchedText: match[0],
		});

		debugLog("handler", "Executing chain operations", {
			from: rangeFrom,
			to: rangeTo,
			deleteRange: `${rangeFrom}-${rangeTo}`,
		});

		// Apply mark using chain API
		chain()
			.focus()
			.deleteRange({ from: rangeFrom, to: rangeTo })
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

		debugLog("handler", "Chain operations completed", {
			insertedText: text,
		});

		// Mark this match as processed to prevent future duplicates
		processedMatches.add(matchId);
		lastProcessedKey = currentKey;

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

