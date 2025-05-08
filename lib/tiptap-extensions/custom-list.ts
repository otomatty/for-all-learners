import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import { mergeAttributes } from "@tiptap/core";

export const CustomBulletList = BulletList.extend({
	renderHTML({ HTMLAttributes }) {
		return [
			"ul",
			mergeAttributes(HTMLAttributes, {
				class: "list-disc list-inside pl-5 space-y-1 mb-4",
			}),
			0,
		];
	},
});

export const CustomOrderedList = OrderedList.extend({
	renderHTML({ HTMLAttributes }) {
		return [
			"ol",
			mergeAttributes(HTMLAttributes, {
				class: "list-decimal list-inside pl-5 space-y-1 mb-4",
			}),
			0,
		];
	},
});
