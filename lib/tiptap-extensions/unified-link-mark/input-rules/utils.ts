/**
 * InputRules utility functions
 * Shared utilities for InputRules
 */

import type { EditorState } from "prosemirror-state";

/**
 * Check if the current position is in a code context
 * @param state - The ProseMirror editor state
 * @returns True if in code block or inline code
 */
export function isInCodeContext(state: EditorState): boolean {
	const $from = state.selection.$from;

	// Check if in code block
	if ($from.parent.type.name === "codeBlock") {
		return true;
	}

	// Check if in inline code
	if ($from.marks().some((m) => m.type.name === "code")) {
		return true;
	}

	return false;
}
