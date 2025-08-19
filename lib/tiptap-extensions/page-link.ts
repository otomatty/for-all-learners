import { createClient } from "@/lib/supabase/client";
import { searchPages } from "@/lib/utils/searchPages";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { ResolvedPos } from "prosemirror-model";
import { toast } from "sonner";
import tippy, { type Instance, type Props } from "tippy.js";

// プラグインキーの作成
const pageLinkPluginKey = new PluginKey("pageLinkPlugin");

// ブラケット自動クローズ用のプラグイン
const bracketPlugin = new Plugin({
	props: {
		handleTextInput(view, from, to, text) {
			if (text !== "[") {
				return false;
			}
			const { state, dispatch } = view;
			const $pos = state.doc.resolve(from);
			// Auto-close only at end of paragraph without trailing text
			if ($pos.parent.type.name === "paragraph") {
				const paraEnd = $pos.end($pos.depth);
				const after = state.doc.textBetween(from, paraEnd, "", "");
				if (/^\s*$/.test(after)) {
					// Auto-close brackets
					const tr = state.tr.insertText("[]", from, to);
					tr.setSelection(TextSelection.create(tr.doc, from + 1));
					dispatch(tr);
					return true;
				}
				// Insert single bracket
				const tr = state.tr.insertText("[", from, to);
				tr.setSelection(TextSelection.create(tr.doc, from + 1));
				dispatch(tr);
				return true;
			}
			return false;
		},
	},
});

// Key stores mapping from page title to page ID (null if not exists)
export const existencePluginKey = new PluginKey<Map<string, string | null>>(
	"existencePlugin",
);

// リンク先存在チェック用のプラグイン
const existencePlugin = new Plugin<Map<string, string | null>>({
	key: existencePluginKey,
	state: {
		init: () => new Map<string, string | null>(),
		apply(tr, value) {
			const meta = tr.getMeta(existencePluginKey) as
				| Map<string, string | null>
				| undefined;
			return meta ?? value;
		},
	},
	props: {
		decorations(state) {
			// Retrieve map of title to page ID
			const existMap = existencePluginKey.getState(state) as Map<
				string,
				string | null
			>;
			const decos: Decoration[] = [];
			// Determine the active paragraph range based on the caret position
			const { $from } = state.selection;
			// Safely get paragraph boundaries with bounds checking
			let paraStart: number;
			let paraEnd: number;
			try {
				// Check if depth 1 exists and has valid boundaries
				if ($from.depth >= 1) {
					paraStart = $from.start(1);
					paraEnd = $from.end(1);
				} else {
					// Fallback to document boundaries
					paraStart = 0;
					paraEnd = state.doc.content.size;
				}
			} catch (error) {
				console.warn("Failed to resolve paragraph boundaries:", error);
				// Fallback to safe boundaries
				paraStart = Math.max(0, $from.pos - 100);
				paraEnd = Math.min(state.doc.content.size, $from.pos + 100);
			}
			// Iterate through text nodes and add decorations
			state.doc.descendants((node, pos) => {
				if (!node.isText) return;
				// Safely resolve position and determine if inside code block or inline code
				let $pos: ResolvedPos;
				try {
					$pos = state.doc.resolve(pos);
				} catch (error) {
					console.warn("Failed to resolve position in descendants:", error);
					return; // Skip this node if position cannot be resolved
				}
				const isCodeContext =
					$pos.parent.type.name === "codeBlock" ||
					node.marks.some((mark) => mark.type.name === "code");
				const text = node.text ?? "";
				// Decorate bracket links
				const bracketRegex = /\[([^\[\]]+)\]/g;
				for (const match of text.matchAll(bracketRegex)) {
					const start = pos + (match.index ?? 0);
					const end = start + match[0].length;
					// In code contexts, render as plain span
					if (isCodeContext) {
						decos.push(Decoration.inline(start, end, { nodeName: "span" }));
						continue;
					}
					const title = match[1];
					const isExternal = /^https?:\/\//.test(title);
					const pageId = existMap.get(title);
					const exists = isExternal || Boolean(pageId);
					const cls = exists ? "text-blue-500" : "text-red-500";
					// Build href for link
					const hrefValue = isExternal
						? title
						: pageId
							? `/pages/${pageId}`
							: "#";
					const decoAttrs = {
						nodeName: "a",
						href: hrefValue,
						class: `${cls} underline cursor-pointer whitespace-normal break-all`,
						...(isExternal
							? { target: "_blank", rel: "noopener noreferrer" }
							: {}),
					};
					if (start >= paraStart && end <= paraEnd) {
						decos.push(Decoration.inline(start, end, decoAttrs));
					} else {
						decos.push(
							Decoration.inline(start, start + 1, { style: "display: none" }),
						);
						decos.push(
							Decoration.inline(end - 1, end, { style: "display: none" }),
						);
						const inactiveAttrs: Record<string, string> = {
							...decoAttrs,
							contentEditable: "false",
						};
						if (!isExternal && !pageId) {
							inactiveAttrs["data-page-title"] = title;
						}
						decos.push(Decoration.inline(start + 1, end - 1, inactiveAttrs));
					}
				}
				// Decorate tag links (#text)
				const tagRegex = /#([^\s\[\]]+)/g;
				for (const match of text.matchAll(tagRegex)) {
					const index = match.index ?? 0;
					const start = pos + index;
					const end = start + match[0].length;
					const title = match[1];
					const pageId = existMap.get(title);
					const exists = Boolean(pageId);
					const cls = exists ? "text-blue-500" : "text-red-500";
					// Build anchor attributes
					const decoAttrs: Record<string, string> = {
						nodeName: "a",
						href: exists ? `/pages/${pageId}` : "#",
						class: `${cls} underline cursor-pointer whitespace-normal break-all`,
					};
					// If no page exists, do not allow navigation
					if (!exists) {
						decoAttrs["data-no-page"] = "true";
					}
					decos.push(Decoration.inline(start, end, decoAttrs));
				}
			});
			return DecorationSet.create(state.doc, decos);
		},
	},
});

// Suggestion plugin for bracketed text
const suggestionPluginKey = new PluginKey<SuggestionState>("bracketSuggestion");
interface SuggestionState {
	suggesting: boolean;
	range: { from: number; to: number } | null;
	items: Array<{ id: string; title: string }>;
	activeIndex: number;
	query: string;
}
const suggestionPlugin = new Plugin<SuggestionState>({
	key: suggestionPluginKey,
	state: {
		init: () => ({
			suggesting: false,
			range: null,
			items: [],
			activeIndex: 0,
			query: "",
		}),
		apply(tr, prev) {
			const meta = tr.getMeta(suggestionPluginKey) as
				| SuggestionState
				| undefined;
			return meta ? meta : prev;
		},
	},
	view(view) {
		let timeoutId: number | null = null;
		let tip: Instance<Props> | null = null;
		return {
			update(view) {
				const prev = suggestionPluginKey.getState(
					view.state,
				) as SuggestionState;
				const { $from } = view.state.selection;
				const paraStart = $from.start($from.depth);
				const paraEnd = $from.end($from.depth);
				const text = view.state.doc.textBetween(paraStart, paraEnd, "", "");
				const posInPara = $from.pos - paraStart;
				const localOpen = text.lastIndexOf("[", posInPara - 1);
				const localClose = text.indexOf("]", posInPara);
				if (
					localOpen !== -1 &&
					localClose !== -1 &&
					posInPara > localOpen &&
					posInPara <= localClose
				) {
					const rangeFrom = paraStart + localOpen;
					const rangeTo = paraStart + localClose + 1;
					const query = text.slice(localOpen + 1, posInPara);
					if (
						!prev.suggesting ||
						!prev.range ||
						prev.range.from !== rangeFrom ||
						prev.range.to !== rangeTo ||
						prev.query !== query
					) {
						if (timeoutId) window.clearTimeout(timeoutId);
						timeoutId = window.setTimeout(async () => {
							const items = await searchPages(query);
							const meta: SuggestionState = {
								suggesting: true,
								range: { from: rangeFrom, to: rangeTo },
								items,
								activeIndex: 0,
								query,
							};
							view.dispatch(view.state.tr.setMeta(suggestionPluginKey, meta));
						}, 300);
					}
				} else if (prev.suggesting) {
					if (timeoutId) window.clearTimeout(timeoutId);
					view.dispatch(
						view.state.tr.setMeta(suggestionPluginKey, {
							suggesting: false,
							range: null,
							items: [],
							activeIndex: 0,
							query: "",
						}),
					);
				}
				// render tooltip via Tippy.js
				const state = suggestionPluginKey.getState(
					view.state,
				) as SuggestionState;
				if (state.suggesting && state.range) {
					const { from, to } = state.range;
					const coords = view.coordsAtPos(from);
					const makeList = () => {
						const list = document.createElement("div");
						list.className = "bracket-suggestion-list";
						state.items.forEach((item, i) => {
							const div = document.createElement("div");
							div.textContent = item.title;
							// click to select
							div.addEventListener("mousedown", (e) => {
								e.preventDefault();
								view.dispatch(
									view.state.tr
										.insertText(`[${item.title}]`, from, to)
										.setMeta(suggestionPluginKey, {
											suggesting: false,
											range: null,
											items: [],
											activeIndex: 0,
											query: "",
										}),
								);
								tip?.hide();
							});
							div.className = `suggestion-item${i === state.activeIndex ? " active" : ""}`;
							list.appendChild(div);
						});
						return list;
					};
					if (!tip) {
						tip = tippy(document.body, {
							trigger: "manual",
							interactive: true,
							placement: "bottom-start",
							arrow: false,
							getReferenceClientRect: () =>
								new DOMRect(coords.left, coords.bottom, 0, 0),
							content: makeList(),
						});
					} else {
						tip.setContent(makeList());
						tip.setProps({
							getReferenceClientRect: () =>
								new DOMRect(coords.left, coords.bottom, 0, 0),
						});
					}
					tip.show();
				} else if (tip) {
					tip.hide();
				}
			},
			destroy() {
				if (timeoutId) window.clearTimeout(timeoutId);
				tip?.destroy();
				tip = null;
			},
		};
	},
	props: {
		handleKeyDown(view, event) {
			const sugg = suggestionPluginKey.getState(view.state) as SuggestionState;
			if (!sugg.suggesting || !sugg.range) return false;
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				const dir = event.key === "ArrowDown" ? 1 : -1;
				const newIndex =
					(sugg.activeIndex + dir + sugg.items.length) % sugg.items.length;
				view.dispatch(
					view.state.tr.setMeta(suggestionPluginKey, {
						...sugg,
						activeIndex: newIndex,
					}),
				);
				return true;
			}
			if (event.key === "Tab" || event.key === "Enter") {
				event.preventDefault();
				const item = sugg.items[sugg.activeIndex];
				if (!item) return false;
				const { from, to } = sugg.range;
				view.dispatch(
					view.state.tr
						.insertText(`[${item.title}]`, from, to)
						.setMeta(suggestionPluginKey, {
							suggesting: false,
							range: null,
							items: [],
							activeIndex: 0,
							query: "",
						}),
				);
				return true;
			}
			return false;
		},
	},
});

// ブラケットリンク用のExtension
export const PageLink = Extension.create({
	name: "pageLink",
	addProseMirrorPlugins() {
		return [
			bracketPlugin,
			existencePlugin,
			suggestionPlugin,
			new Plugin({
				key: pageLinkPluginKey,
				props: {
					handleClick: (view, pos, event) => {
						// クリックされた位置のノードとテキスト情報を取得
						const { state } = view;
						const $pos = state.doc.resolve(pos);
						const node = $pos.node();

						if (!node.isText) return false;

						// コードブロックおよびインラインコード内のブラケットをリンク化しない
						if (
							$pos.parent.type.name === "codeBlock" ||
							node.marks.some((mark) => mark.type.name === "code")
						)
							return;

						const text = node.text || "";
						const posInNode = $pos.textOffset;

						// クリック位置を含むブラケットテキストを検出
						let bracketStart = -1;
						let bracketEnd = -1;
						let inBracket = false;
						let bracketContent = "";

						for (let i = 0; i < text.length; i++) {
							if (text[i] === "[" && !inBracket) {
								bracketStart = i;
								inBracket = true;
								continue;
							}
							if (text[i] === "]" && inBracket) {
								bracketEnd = i;
								if (posInNode >= bracketStart && posInNode <= bracketEnd) {
									bracketContent = text.substring(bracketStart + 1, bracketEnd);
									break;
								}
								inBracket = false;
								bracketStart = -1;
							}
						}

						if (!bracketContent) return false;

						// Convert underscores to spaces for page title search and creation
						const searchTitle = bracketContent.replace(/_/g, " ");

						// 外部リンクかどうかをチェック
						if (/^https?:\/\//.test(bracketContent)) {
							window.open(bracketContent, "_blank");
							return true;
						}

						// 内部リンクの処理
						(async () => {
							const supabase = createClient();
							const {
								data: { user },
								error: authError,
							} = await supabase.auth.getUser();
							if (authError || !user) {
								toast.error("ログインしてください");
								return;
							}

							const { data: pages, error: searchError } = await supabase
								.from("pages")
								.select("id")
								.eq("title", searchTitle)
								.limit(1);
							if (searchError) {
								console.error("ページの検索に失敗しました:", searchError);
								toast.error("ページの検索に失敗しました");
								return;
							}

							let pageId: string;
							if (pages && pages.length > 0) {
								pageId = pages[0].id;
							} else {
								const { data: newPage, error: insertError } = await supabase
									.from("pages")
									.insert({
										user_id: user.id,
										title: searchTitle,
										content_tiptap: { type: "doc", content: [] },
										is_public: false,
									})
									.select("id")
									.single();
								if (insertError || !newPage) {
									console.error("ページの作成に失敗しました:", insertError);
									toast.error("ページの作成に失敗しました");
									return;
								}
								pageId = newPage.id;
								toast.success(`新しいページ「${searchTitle}」を作成しました`);
							}

							window.location.href = `/pages/${pageId}?newPage=${pages?.length === 0}`;
						})();

						return true;
					},
					// Intercept DOM click on <a> tags to perform navigation
					handleDOMEvents: {
						click(view, event) {
							const target = event.target as HTMLAnchorElement;
							if (target.tagName === "A") {
								// Create and navigate for new-page links
								const newTitle = target.getAttribute("data-page-title");
								if (newTitle) {
									event.preventDefault();
									// Convert underscores to spaces for new page title
									const titleWithSpaces = newTitle.replace(/_/g, " ");
									(async () => {
										const supabase = createClient();
										const {
											data: { user },
											error: authError,
										} = await supabase.auth.getUser();
										if (authError || !user) {
											toast.error("ログインしてください");
											return;
										}
										// Insert new page
										const { data: newPage, error: insertError } = await supabase
											.from("pages")
											.insert({
												user_id: user.id,
												title: titleWithSpaces,
												content_tiptap: { type: "doc", content: [] },
												is_public: false,
											})
											.select("id")
											.single();
										if (insertError || !newPage) {
											console.error("ページ作成失敗:", insertError);
											toast.error("ページ作成に失敗しました");
											return;
										}
										window.location.href = `/pages/${newPage.id}?newPage=true`;
									})();
									return true;
								}
								// Otherwise, handle normal navigation
								if (target.hasAttribute("href")) {
									const href = target.getAttribute("href");
									if (href && href !== "#") {
										if (target.target === "_blank") {
											window.open(href, "_blank");
										} else {
											window.location.href = href;
										}
									}
									event.preventDefault();
									return true;
								}
							}
							return false;
						},
					},
				},
			}),
		];
	},
});
