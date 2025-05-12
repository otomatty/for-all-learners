/**
 * GyazoのURLを貼り付けた際、自動的にGyazoの画像を挿入する拡張機能
 */
import { nodeInputRule, nodePasteRule } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "prosemirror-state";
import { GyazoImageNodeView } from "./gyazo-image-nodeview";

export const GyazoImage = Image.extend({
	name: "gyazoImage",

	addAttributes() {
		return {
			...this.parent?.(),
			fullWidth: { default: false },
		};
	},

	addOptions() {
		return {
			...this.parent?.(),
			HTMLAttributes: {
				class: "image",
			},
		};
	},

	addInputRules() {
		return [
			// double-bracket wrapper triggers full-width image
			nodeInputRule({
				find: /\[\[https:\/\/gyazo\.com\/([A-Za-z0-9]+)\]\]/,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					return { src: `https://i.gyazo.com/${id}.png`, fullWidth: true };
				},
			}),
			// wrapper syntax [GyazoのURL]
			nodeInputRule({
				find: /\[https:\/\/gyazo\.com\/([A-Za-z0-9]+)\]/,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					return { src: `https://i.gyazo.com/${id}.png` };
				},
			}),
			// direct Gyazo page URL
			nodeInputRule({
				find: /https:\/\/gyazo\.com\/([A-Za-z0-9]+)/,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					return { src: `https://i.gyazo.com/${id}.png` };
				},
			}),
			// direct image URL from i.gyazo.com
			nodeInputRule({
				find: /https:\/\/i\.gyazo\.com\/([A-Za-z0-9]+)\.png/,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					return { src: `https://i.gyazo.com/${id}.png` };
				},
			}),
		];
	},

	addPasteRules() {
		return [
			// double-bracket wrapper triggers full-width image
			nodePasteRule({
				find: /\[\[https:\/\/gyazo\.com\/([A-Za-z0-9]+)\]\]/g,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					return { src: `https://i.gyazo.com/${id}.png`, fullWidth: true };
				},
			}),
			// wrapper syntax [GyazoのURL]
			nodePasteRule({
				find: /\[https:\/\/gyazo\.com\/([A-Za-z0-9]+)\]/g,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					return { src: `https://i.gyazo.com/${id}.png` };
				},
			}),
			// direct Gyazo page URL
			nodePasteRule({
				find: /https:\/\/gyazo\.com\/([A-Za-z0-9]+)/g,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					return { src: `https://i.gyazo.com/${id}.png` };
				},
			}),
			// direct image URL from i.gyazo.com
			nodePasteRule({
				find: /https:\/\/i\.gyazo\.com\/([A-Za-z0-9]+)\.png/g,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					return { src: `https://i.gyazo.com/${id}.png` };
				},
			}),
		];
	},

	/**
	 * Wrap plain Gyazo URL on paste into the wrapper syntax.
	 */
	addProseMirrorPlugins() {
		const wrapKey = new PluginKey("gyazoPasteWrapper");
		const wrapPlugin = new Plugin({
			key: wrapKey,
			props: {
				handlePaste(view, event) {
					const text = event.clipboardData?.getData("text/plain");
					const match = text?.match(/https:\/\/gyazo\.com\/[A-Za-z0-9]+/);
					if (match) {
						const wrapped = `[${match[0]}]`;
						view.dispatch(
							view.state.tr
								.replaceSelectionWith(view.state.schema.text(wrapped))
								.scrollIntoView(),
						);
						return true;
					}
					return false;
				},
			},
		});
		return [wrapPlugin];
	},

	/**
	 * Use a React NodeView to toggle between image and URL text on selection.
	 */
	addNodeView() {
		return ReactNodeViewRenderer(GyazoImageNodeView);
	},
});
