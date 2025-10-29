/**
 * unwrapBrackets command
 * Removes brackets and unifiedLink mark from selection
 * Converts [text] back to text
 */

import type { CommandProps, Editor } from "@tiptap/core";
import type { MarkType } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";

/**
 * Create the unwrapBrackets command
 * Removes brackets and marks from the current selection
 * @param context - Command context containing editor and type
 * @returns Command function
 */
export function createUnwrapBracketsCommand(context: {
	editor: Editor;
	type: MarkType;
}) {
	return () =>
		({ state, dispatch }: CommandProps) => {
			const { selection } = state;
			const { from, to } = selection;

			if (from >= to) {
				return false;
			}

			// Find the bracket range by checking adjacent characters
			let bracketFrom = from;
			let bracketTo = to;

			// Check if selection is inside brackets
			const textBefore = state.doc.textBetween(Math.max(0, from - 1), from, "");
			const textAfter = state.doc.textBetween(
				to,
				Math.min(state.doc.content.size, to + 1),
				"",
			);

			// Expand selection to include brackets if they exist
			if (textBefore === "[") bracketFrom = from - 1;
			if (textAfter === "]") bracketTo = to + 1;

			const textContent = state.doc.textBetween(bracketFrom, bracketTo, "");

			// Remove brackets if present
			const unwrappedText = textContent.replace(/^\[/, "").replace(/\]$/, "");

			if (dispatch) {
				const tr = state.tr;

				// Remove the mark first
				tr.removeMark(bracketFrom, bracketTo, context.type);

				// Replace [text] with text
				tr.replaceWith(
					bracketFrom,
					bracketTo,
					state.schema.text(unwrappedText),
				);

				// Set cursor at the end of unwrapped text
				const newPos = bracketFrom + unwrappedText.length;
				tr.setSelection(TextSelection.create(tr.doc, newPos));

				dispatch(tr);
			}

			return true;
		};
}
