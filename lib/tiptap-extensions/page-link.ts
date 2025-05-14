import { createClient } from "@/lib/supabase/client";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { toast } from "sonner";

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
			state.doc.descendants((node, pos) => {
				if (!node.isText) return;
				const text = node.text ?? "";
				const regex = /\[([^\[\]]+)\]/g;
				let match: RegExpExecArray | null = regex.exec(text);
				while (match !== null) {
					const start = pos + match.index;
					const end = start + match[0].length;
					const title = match[1];
					const isExternal = /^https?:\/\//.test(title);
					// Determine page ID for internal links
					const pageId = existMap.get(title);
					const exists = isExternal || Boolean(pageId);
					const cls = exists ? "text-blue-500" : "text-red-500";

					// Build href: external URLs or internal page if exists
					const hrefValue = isExternal
						? title
						: pageId
							? `/pages/${pageId}`
							: "#";
					const decoAttrs = {
						nodeName: "a",
						href: hrefValue,
						class: `${cls} underline cursor-pointer`,
						...(isExternal
							? { target: "_blank", rel: "noopener noreferrer" }
							: {}),
					};
					decos.push(Decoration.inline(start, end, decoAttrs));
					match = regex.exec(text);
				}
			});
			return DecorationSet.create(state.doc, decos);
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
			new Plugin({
				key: pageLinkPluginKey,
				props: {
					handleClick: (view, pos, event) => {
						// クリックされた位置のノードとテキスト情報を取得
						const { state } = view;
						const $pos = state.doc.resolve(pos);
						const node = $pos.node();

						if (!node.isText) return false;

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
								.eq("title", bracketContent)
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
										title: bracketContent,
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
								toast.success(
									`新しいページ「${bracketContent}」を作成しました`,
								);
							}

							window.location.href = `/pages/${pageId}?newPage=${pages?.length === 0}`;
						})();

						return true;
					},
					// Intercept DOM click on <a> tags to perform navigation
					handleDOMEvents: {
						click(view, event) {
							const target = event.target as HTMLElement;
							if (target.tagName === "A" && target.hasAttribute("href")) {
								const href = target.getAttribute("href");
								if (href && href !== "#") {
									window.location.href = href;
								}
								event.preventDefault();
								return true;
							}
							return false;
						},
					},
				},
			}),
		];
	},
});
