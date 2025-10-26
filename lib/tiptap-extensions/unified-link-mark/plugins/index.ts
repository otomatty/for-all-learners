/**
 * UnifiedLinkMark ProseMirror plugins
 * Exports all plugins
 */

import type { Editor } from "@tiptap/core";
import type { UnifiedLinkMarkOptions } from "../types";
import { createAutoBracketPlugin } from "./auto-bracket-plugin";
import { createBracketCursorPlugin } from "./bracket-cursor-plugin";
import { createBracketMonitorPlugin } from "./bracket-monitor-plugin";
import { createClickHandlerPlugin } from "./click-handler-plugin";
import { createSuggestionPlugin } from "./suggestion-plugin";
import { createTagMonitorPlugin } from "./tag-monitor-plugin";

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
		createBracketMonitorPlugin(context.editor), // Add bracket monitor plugin
		createClickHandlerPlugin(context),
		createSuggestionPlugin(context),
		createTagMonitorPlugin(context.editor), // Add tag monitor plugin
	];
}
