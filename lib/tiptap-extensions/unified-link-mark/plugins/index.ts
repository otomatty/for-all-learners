/**
 * UnifiedLinkMark ProseMirror plugins
 * Exports all plugins
 */

import type { Editor } from "@tiptap/core";
import type { UnifiedLinkMarkOptions } from "../types";
import { createAutoBracketPlugin } from "./auto-bracket-plugin";
// import { createBracketCursorPlugin } from "./bracket-cursor-plugin"; // DISABLED: Replaced by bracket-monitor-plugin
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
		// createBracketCursorPlugin(context.editor), // DISABLED: Replaced by bracket-monitor-plugin
		createBracketMonitorPlugin(context.editor), // Real-time bracket monitoring
		createClickHandlerPlugin(context),
		createSuggestionPlugin(context),
		createTagMonitorPlugin(context.editor), // Real-time tag monitoring
	];
}
