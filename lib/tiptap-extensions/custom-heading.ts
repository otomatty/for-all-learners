import { mergeAttributes, textblockTypeInputRule } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";

export const CustomHeading = Heading.extend({
	addInputRules() {
		// Override default heading input rules to shift levels by 1
		// # text -> H2, ## text -> H3, etc.
		// This prevents H1 conflicts with page title while allowing # notation
		return this.options.levels.map((level) => {
			// Map markdown notation to heading level + 1
			// For level 2: match # (1 hash)
			// For level 3: match ## (2 hashes)
			// etc.
			const hashCount = Math.max(1, level - 1);

			return textblockTypeInputRule({
				find: new RegExp(`^(#{${hashCount}})\\s$`),
				type: this.type,
				getAttributes: {
					level,
				},
			});
		});
	},

	renderHTML({ node, HTMLAttributes }) {
		const level = node.attrs.level;
		const sizeClassMap: Record<number, string> = {
			1: "text-2xl sm:text-3xl md:text-4xl font-bold mt-6 mb-4",
			2: "text-xl sm:text-2xl md:text-3xl font-bold mt-5 mb-3",
			3: "text-lg sm:text-xl md:text-2xl font-bold mt-4 mb-2",
			4: "text-base sm:text-lg md:text-xl font-semibold mt-3 mb-1",
			5: "text-sm sm:text-base md:text-lg font-semibold mt-2 mb-0",
			6: "text-xs sm:text-sm md:text-base font-semibold mt-1 mb-0",
		};
		const sizeClass = sizeClassMap[level] || "";
		return [
			`h${level}`,
			mergeAttributes(HTMLAttributes, { class: sizeClass }),
			0,
		];
	},
});
