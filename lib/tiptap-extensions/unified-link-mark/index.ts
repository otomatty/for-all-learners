/**
 * UnifiedLinkMark - Unified Link Mark Extension
 * Handles both [Title] and #tag notations in a single mark
 */

import { Mark } from "@tiptap/core";
import { unifiedLinkAttributes } from "./attributes";
import { createCommands } from "./commands";
import { DEFAULT_OPTIONS } from "./config";
import { createInputRules } from "./input-rules";
import { onCreateHandler, onDestroyHandler } from "./lifecycle";
import { createPlugins } from "./plugins";
import { parseHTML, renderHTML } from "./rendering";
import type { UnifiedLinkMarkOptions } from "./types";

export * from "./config";
export * from "./resolver-queue";
export * from "./state-manager";
// Re-export types for backward compatibility
export * from "./types";

/**
 * UnifiedLinkMark Extension
 * A TipTap mark extension for handling unified links
 */
export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
	name: "unilink",
	priority: 1000,
	inclusive: false,

	addOptions() {
		return DEFAULT_OPTIONS;
	},

	onCreate() {
		onCreateHandler(this.editor);
	},

	onDestroy() {
		onDestroyHandler();
	},

	addAttributes() {
		return unifiedLinkAttributes;
	},

	renderHTML({ HTMLAttributes }) {
		return renderHTML(HTMLAttributes, this.options);
	},

	parseHTML() {
		const parsers = parseHTML();
		return parsers;
	},

	addCommands() {
		return createCommands({
			editor: this.editor,
			type: this.type,
		});
	},

	addInputRules() {
		return createInputRules({
			editor: this.editor,
			name: this.name,
		});
	},

	addProseMirrorPlugins() {
		return createPlugins({
			editor: this.editor,
			options: this.options,
		});
	},
});
