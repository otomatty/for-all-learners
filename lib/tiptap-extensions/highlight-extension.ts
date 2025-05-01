import { Mark, mergeAttributes, type Command } from "@tiptap/core";

/**
 * Options type for the Highlight mark.
 */
export interface HighlightOptions {
	HTMLAttributes: { class: string };
}

/**
 * Highlight mark for Tiptap to visually emphasize selected keywords.
 * Wraps content in a <mark> tag with a yellow background.
 */
export const Highlight = Mark.create<HighlightOptions, unknown>({
	name: "highlight",
	addOptions() {
		return {
			HTMLAttributes: {
				class: "bg-yellow-200",
			},
		};
	},
	parseHTML() {
		return [{ tag: "mark" }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"mark",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
			0,
		];
	},
	/**
	 * Register commands for setting and unsetting the highlight mark.
	 */
	addCommands() {
		return {
			/**
			 * Apply highlight to the current selection.
			 */
			setHighlight:
				(attributes: Record<string, unknown>): Command =>
				({ commands }) =>
					commands.setMark(this.name, attributes),
			/**
			 * Remove highlight from the current selection.
			 */
			unsetHighlight:
				(): Command =>
				({ commands }) =>
					commands.unsetMark(this.name),
		};
	},
});

// Register highlight commands in Tiptap's Commands interface for type safety
declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		highlight: {
			/** Apply highlight to the selected text */
			setHighlight: (attributes: Record<string, unknown>) => ReturnType;
			/** Remove highlight from the selected text */
			unsetHighlight: () => ReturnType;
		};
	}
}
