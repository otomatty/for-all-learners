/**
 * wrapWithBrackets command
 * Wraps selected text with brackets [text]
 * The bracket monitor plugin will automatically apply the UnifiedLinkMark
 */

import type { CommandProps } from "@tiptap/core";
import { TextSelection } from "prosemirror-state";

/**
 * Create the wrapWithBrackets command
 * Wraps selected text with brackets and lets the monitor plugin handle marking
 * @returns Command function
 */
export function createWrapWithBracketsCommand() {
	return () =>
		({ state, dispatch }: CommandProps) => {
			const { selection } = state;
			const { from, to } = selection;

			// Require a non-empty selection
			if (from >= to) {
				return false;
			}

			const selectedText = state.doc.textBetween(from, to, "");

			if (dispatch) {
				// Replace selection with [text]
				const wrappedText = `[${selectedText}]`;
				const tr = state.tr.replaceWith(
					from,
					to,
					state.schema.text(wrappedText),
				);

				// Set cursor after the closing bracket
				const newPos = from + wrappedText.length;
				tr.setSelection(TextSelection.create(tr.doc, newPos));

				dispatch(tr);
			}

			return true;
		};
}
