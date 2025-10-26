// global.d.ts
declare module "shiki/themes/*.json";

// TipTap custom commands
import "@tiptap/core";
import type { UnifiedLinkAttributes } from "./lib/tiptap-extensions/unified-link-mark";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		unilink: {
			/**
			 * Insert a unified link mark
			 */
			insertUnifiedLink: (attrs: Partial<UnifiedLinkAttributes>) => ReturnType;
			/**
			 * Refresh all unified links
			 */
			refreshUnifiedLinks: () => ReturnType;
			/**
			 * Wrap selected text with brackets [text]
			 * The bracket monitor plugin will automatically apply the mark
			 */
			wrapWithBrackets: () => ReturnType;
			/**
			 * Remove brackets and mark from selected text
			 * Converts [text] back to text
			 */
			unwrapBrackets: () => ReturnType;
		};
	}
}
