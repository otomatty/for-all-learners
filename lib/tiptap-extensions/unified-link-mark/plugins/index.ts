/**
 * UnifiedLinkMark ProseMirror plugins
 * Exports all plugins
 */

import type { Editor } from "@tiptap/core";
import type { UnifiedLinkMarkOptions } from "../types";
import { createAutoBracketPlugin } from "./auto-bracket-plugin";
import { createBracketCursorPlugin } from "./bracket-cursor-plugin";
import { createClickHandlerPlugin } from "./click-handler-plugin";
import { createSuggestionPlugin } from "./suggestion-plugin";

/**
 * Create all ProseMirror plugins for UnifiedLinkMark
 * @param context - Plugin context
 * @returns Array of ProseMirror plugins
 */
export function createPlugins(context: {
	editor: Editor;
	options: UnifiedLinkMarkOptions;
}) {
	return [
		createAutoBracketPlugin(),
		createBracketCursorPlugin(context.editor),
		createClickHandlerPlugin(context),
		createSuggestionPlugin(context),
	];
}
