import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Highlight mark for Tiptap to visually emphasize selected keywords.
 * Wraps content in a <mark> tag with a yellow background.
 */
export const Highlight = Mark.create({
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
				(attributes: Record<string, unknown>) =>
				({ commands }) => {
					return commands.setMark(this.name, attributes);
				},
			/**
			 * Remove highlight from the current selection.
			 */
			unsetHighlight:
				() =>
				({ commands }) => {
					return commands.unsetMark(this.name);
				},
		} as any;
	},
});
