/**
 * Comma-to-Bracket InputRule (,,, → [)
 * Converts three consecutive commas to an opening bracket for mobile-friendly input
 */

import type { Editor } from "@tiptap/core";
import { InputRule } from "@tiptap/core";
import { isInCodeContext } from "./utils";

/**
 * Create the comma-to-bracket InputRule
 * Converts `,,,` to `[` for easier bracket input on mobile devices
 * @param _context - InputRule context (unused)
 * @returns InputRule instance
 */
export function createCommaToBracketInputRule(_context: {
	editor: Editor;
	name: string;
}) {
	return new InputRule({
		// Match exactly three consecutive commas at the end
		// Use negative lookbehind to ensure it's not preceded by a comma
		find: /(?<!,),,,$/,
		handler: ({ state, range, chain }) => {
			// Suppress in code context
			if (isInCodeContext(state)) {
				return;
			}

			const { from, to } = range;
			const $pos = state.doc.resolve(from);

			// Check if we're at the end of paragraph (like auto-bracket-plugin does)
			const shouldAutoClose =
				$pos.parent.type.name === "paragraph" &&
				/^\s*$/.test(state.doc.textBetween(to, $pos.end($pos.depth)));

			if (shouldAutoClose) {
				// Replace `,,,` with `[]` and place cursor inside
				chain()
					.focus()
					.deleteRange({ from, to })
					.insertContent({
						type: "text",
						text: "[]",
					})
					.setTextSelection({ from: from + 1, to: from + 1 }) // Place cursor between brackets
					.run();
			} else {
				// Just replace with `[` if not at end of paragraph
				chain()
					.focus()
					.deleteRange({ from, to })
					.insertContent({
						type: "text",
						text: "[",
					})
					.run();
			}
		},
	});
}
