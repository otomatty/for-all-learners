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
		console.log(
			"🖼️ GyazoImage: addInputRules called - InputRules are being registered",
		);
		const rules = [
			// double-bracket wrapper triggers full-width image
			nodeInputRule({
				find: /\[\[https:\/\/gyazo\.com\/([A-Za-z0-9]+)\]\]/,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					console.log("🖼️ GyazoImage: Double-bracket InputRule triggered", {
						fullMatch: match[0],
						id: match[1],
						matchIndex: match.index,
						matchLength: match[0].length,
					});
					return { src: `https://i.gyazo.com/${id}.png`, fullWidth: true };
				},
			}),
			// wrapper syntax [GyazoのURL] - FIXED: より厳密なマッチング
			nodeInputRule({
				find: /^\[https:\/\/gyazo\.com\/([A-Za-z0-9]+)\]$/,
				type: this.type,
				getAttributes: (match: RegExpMatchArray) => {
					const id = match[1];
					console.log(
						"🖼️ GyazoImage: Single-bracket InputRule triggered (FIXED)",
						{
							fullMatch: match[0],
							id: match[1],
							matchIndex: match.index,
							matchLength: match[0].length,
							textBeforeMatch: match.input?.substring(0, match.index || 0),
							textAfterMatch: match.input?.substring(
								(match.index || 0) + match[0].length,
							),
							inputLength: match.input?.length,
							isExactMatch: match[0] === match.input,
						},
					);
					return { src: `https://i.gyazo.com/${id}.png` };
				},
			}),
			// DISABLED: direct URLs to avoid conflicts
			// nodeInputRule({
			// 	find: /https:\/\/gyazo\.com\/([A-Za-z0-9]+)/,
			// 	type: this.type,
			// 	getAttributes: (match: RegExpMatchArray) => {
			// 		const id = match[1];
			// 		return { src: `https://i.gyazo.com/${id}.png` };
			// 	},
			// }),
			// nodeInputRule({
			// 	find: /https:\/\/i\.gyazo\.com\/([A-Za-z0-9]+)\.png/,
			// 	type: this.type,
			// 	getAttributes: (match: RegExpMatchArray) => {
			// 		const id = match[1];
			// 		return { src: `https://i.gyazo.com/${id}.png` };
			// 	},
			// }),
		];
		console.log("🖼️ GyazoImage: Returning", rules.length, "InputRules");
		return rules;
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
					console.log("🖼️ GyazoImage: PasteRule triggered", {
						fullMatch: match[0],
						id: match[1],
						matchIndex: match.index,
						matchLength: match[0].length,
					});
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
		const debugKey = new PluginKey("gyazoDebugPlugin");

		const wrapPlugin = new Plugin({
			key: wrapKey,
			props: {
				handlePaste(view, event) {
					const text = event.clipboardData?.getData("text/plain");
					const match = text?.match(/https:\/\/gyazo\.com\/([A-Za-z0-9]+)/);
					if (match) {
						console.log("🖼️ GyazoImage: Direct paste conversion", {
							originalText: text,
							id: match[1],
						});

						// 直接画像ノードに変換（ブラケット化をスキップ）
						const schema = view.state.schema;
						const imageType = schema.nodes.gyazoImage;
						if (imageType) {
							const imageNode = imageType.create({
								src: `https://i.gyazo.com/${match[1]}.png`,
							});

							view.dispatch(
								view.state.tr.replaceSelectionWith(imageNode).scrollIntoView(),
							);
							return true;
						}
					}
					return false;
				},
			},
		});

		// デバッグ用プラグイン: Enterキー監視と手動変換テスト
		const debugPlugin = new Plugin({
			key: debugKey,
			props: {
				handleKeyDown(view, event) {
					if (event.key === "Enter") {
						const { state } = view;
						const { from, to } = state.selection;
						const textAround = state.doc.textBetween(
							Math.max(0, from - 50),
							Math.min(state.doc.content.size, to + 50),
						);

						console.log("🖼️ GyazoImage: Enter key pressed", {
							cursorPos: from,
							selection: { from, to },
							textAround: textAround,
							docSize: state.doc.content.size,
						});

						// 手動でInputRule相当の処理をテスト
						const bracketMatch = textAround.match(
							/\[https:\/\/gyazo\.com\/([A-Za-z0-9]+)\]/,
						);
						if (bracketMatch) {
							console.log(
								"🖼️ GyazoImage: Manual bracket detection in Enter handler",
								{
									match: bracketMatch[0],
									id: bracketMatch[1],
								},
							);

							// Ctrl+Enter で手動変換をテスト
							if (event.ctrlKey || event.metaKey) {
								event.preventDefault();
								console.log("🖼️ GyazoImage: Manual conversion triggered");

								const schema = view.state.schema;
								const imageType = schema.nodes.gyazoImage;
								if (imageType) {
									const imageNode = imageType.create({
										src: `https://i.gyazo.com/${bracketMatch[1]}.png`,
									});

									// 現在のパラグラフ全体を画像に置換
									const $pos = state.doc.resolve(from);
									const paraStart = $pos.start($pos.depth);
									const paraEnd = $pos.end($pos.depth);

									view.dispatch(
										state.tr.replaceWith(paraStart, paraEnd, imageNode),
									);
								}
								return true;
							}
						}
					}
					return false;
				},
			},
		});

		return [wrapPlugin, debugPlugin];
	},

	/**
	 * Use a React NodeView to toggle between image and URL text on selection.
	 */
	addNodeView() {
		return ReactNodeViewRenderer(GyazoImageNodeView);
	},
});
