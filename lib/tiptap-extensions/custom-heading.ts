import { mergeAttributes } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";

export const CustomHeading = Heading.extend({
	renderHTML({ node, HTMLAttributes }) {
		const level = node.attrs.level;
		const sizeClassMap: Record<number, string> = {
			1: "text-4xl font-bold mt-6 mb-4",
			2: "text-3xl font-bold mt-5 mb-3",
			3: "text-2xl font-bold mt-4 mb-2",
			4: "text-xl font-semibold mt-3 mb-1",
			5: "text-lg font-semibold mt-2 mb-0",
			6: "text-base font-semibold mt-1 mb-0",
		};
		const sizeClass = sizeClassMap[level] || "";
		return [
			`h${level}`,
			mergeAttributes(HTMLAttributes, { class: sizeClass }),
			0,
		];
	},
});
