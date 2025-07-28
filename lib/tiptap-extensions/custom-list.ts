import { mergeAttributes, wrappingInputRule } from "@tiptap/core";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import { sinkListItem } from "prosemirror-schema-list";
import { Plugin, PluginKey } from "prosemirror-state";

export const CustomBulletList = BulletList.extend({
	addInputRules() {
		// Allow single space, hyphen+space or asterisk+space at start to create a bullet list
		const rules = super.addInputRules?.() ?? [];
		return [
			wrappingInputRule({
				find: /^ $/, // single space
				type: this.type,
			}),
			wrappingInputRule({
				find: /^-\s$/, // hyphen + space
				type: this.type,
			}),
			wrappingInputRule({
				find: /^\*\s$/, // asterisk + space
				type: this.type,
			}),
			...rules,
		];
	},
	addProseMirrorPlugins() {
		const plugins = super.addProseMirrorPlugins?.() ?? [];
		const indentPlugin = new Plugin({
			key: new PluginKey("customBulletIndent"),
			props: {
				handleKeyDown(view, event) {
					if (event.key !== " ") return false;
					const { state, dispatch } = view;
					// Attempt to indent the list item by sinking it
					const cmd = sinkListItem(state.schema.nodes.listItem);
					if (cmd(state, dispatch)) {
						event.preventDefault();
						return true;
					}
					return false;
				},
			},
		});
		return [...plugins, indentPlugin];
	},
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
