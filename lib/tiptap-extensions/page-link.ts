import {
  PageLinkPreviewCard,
  PageLinkPreviewCardError,
  PageLinkPreviewCardLoading,
} from "@/components/page-link-preview-card";
import { pagePreviewService } from "@/lib/services/page-preview-service";
import { createClient } from "@/lib/supabase/client";
import { searchPages } from "@/lib/utils/searchPages";
import { Extension } from "@tiptap/core";
import type { ResolvedPos } from "prosemirror-model";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import React from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import tippy, { type Instance, type Props } from "tippy.js";

// プラグインキーの作成
const pageLinkPluginKey = new PluginKey("pageLinkPlugin");

// ブラケット内容の解析結果
interface BracketContent {
  slug: string;
  isIcon: boolean;
  type: "page" | "icon" | "external";
}

/**
 * ブラケット内容を解析して種別を判定
 */
function parseBracketContent(content: string): BracketContent {
  // .iconサフィックス検知
  const iconMatch = content.match(/^(.+)\.icon$/);
  if (iconMatch) {
    return {
      slug: iconMatch[1],
      isIcon: true,
      type: "icon",
    };
  }

  // 外部リンク判定
  if (/^https?:\/\//.test(content)) {
    return {
      slug: content,
      isIcon: false,
      type: "external",
    };
  }

  return {
    slug: content,
    isIcon: false,
    type: "page",
  };
}

// ページリンク用 Decoration 属性生成ヘルパー
// 返り値は常に string 値のみを持つことで DecorationAttrs との整合性を保証
interface PageLinkAttrParams {
  href: string;
  className: string;
  isExternal: boolean;
  pageId: string | null | undefined;
  title: string; // オリジナルのブラケット内テキスト
  lock: boolean; // 非アクティブ時は contentEditable を無効化
}
function buildPageLinkAttrs({
  href,
  className,
  isExternal,
  pageId,
  title,
  lock,
}: PageLinkAttrParams) {
  const attrs = {
    nodeName: "a",
    href,
    class: className,
    ...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {}),
    // 未作成ページ: data-page-title でタイトルを保持
    ...(!isExternal && !pageId ? { "data-page-title": title } : {}),
    // 既存ページ: data-page-id
    ...(pageId && !isExternal ? { "data-page-id": pageId } : {}),
    ...(lock ? { contentEditable: "false" } : {}),
  } satisfies Record<string, string>;
  return attrs;
}

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
  "existencePlugin"
);

// リンク先存在チェック用のプラグイン
const existencePlugin = new Plugin<Map<string, string | null>>({
  key: existencePluginKey,
  state: {
    init: () => {
      // 初期状態では空のMapを返すが、すぐにuseLinkExistenceCheckerが更新する
      return new Map<string, string | null>();
    },
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

          const bracketContent = parseBracketContent(match[1]);

          if (bracketContent.isIcon) {
            // アイコン表示の処理
            const pageId = existMap.get(bracketContent.slug);
            const exists = Boolean(pageId);

            const decoAttrs = {
              nodeName: "span",
              class: "inline-flex items-center user-icon-wrapper",
              "data-user-slug": bracketContent.slug,
              "data-is-icon": "true",
              "data-page-id": pageId || "",
              "data-exists": exists.toString(),
              style: "vertical-align: middle;",
            };

            if (start >= paraStart && end <= paraEnd) {
              decos.push(Decoration.inline(start, end, decoAttrs));
            } else {
              // 非アクティブ時も同様の処理
              decos.push(
                Decoration.inline(start, start + 1, { style: "display: none" })
              );
              decos.push(
                Decoration.inline(end - 1, end, { style: "display: none" })
              );
              decos.push(
                Decoration.inline(start + 1, end - 1, {
                  ...decoAttrs,
                  contentEditable: "false",
                })
              );
            }
          } else {
            // 既存のページリンク処理
            const title = bracketContent.slug;
            const isExternal = bracketContent.type === "external";
            const pageId = existMap.get(title);
            const exists = isExternal || Boolean(pageId);
            const cls = exists ? "text-blue-500" : "text-red-500";
            // Build href for link
            const hrefValue = isExternal
              ? title
              : pageId
              ? `/pages/${pageId}`
              : "#";
            const isActive = start >= paraStart && end <= paraEnd;

            // ブラケットの描画を抑制
            decos.push(
              Decoration.inline(start, start + 1, { style: "display: none" })
            );
            decos.push(
              Decoration.inline(end - 1, end, { style: "display: none" })
            );

            // 安全な文字列属性のみを構築
            const linkContentAttrs = buildPageLinkAttrs({
              href: hrefValue,
              className: `${cls} underline cursor-pointer whitespace-normal break-all`,
              isExternal,
              pageId: pageId ?? null,
              title,
              lock: !isActive,
            });
            decos.push(Decoration.inline(start + 1, end - 1, linkContentAttrs));
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
          view.state
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
            })
          );
        }
        // render tooltip via Tippy.js
        const state = suggestionPluginKey.getState(
          view.state
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
                    })
                );
                tip?.hide();
              });
              div.className = `suggestion-item${
                i === state.activeIndex ? " active" : ""
              }`;
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
          })
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
            })
        );
        return true;
      }
      return false;
    },
  },
});

// ページプレビュー用のプラグイン
const previewPluginKey = new PluginKey("pagePreviewPlugin");

// グローバルな状態管理
let hidePreviewTimeout: NodeJS.Timeout | null = null;

const previewPlugin = new Plugin({
  key: previewPluginKey,
  state: {
    init: () => ({
      tip: null as Instance<Props> | null,
      currentPageId: null as string | null,
    }),
    apply(tr, state) {
      return state;
    },
  },
  props: {
    handleDOMEvents: {
      mouseover(view, event) {
        const target = event.target as HTMLElement;
        if (target.tagName === "A" && target.hasAttribute("data-page-id")) {
          const pageId = target.getAttribute("data-page-id");
          if (pageId) {
            // 非表示タイムアウトをクリア（re-hover時）
            if (hidePreviewTimeout) {
              clearTimeout(hidePreviewTimeout);
              hidePreviewTimeout = null;
            }

            // 既存のホバータイムアウトをクリア
            const targetEl = target as HTMLElement & {
              _hoverTimeout?: NodeJS.Timeout;
            };
            if (targetEl._hoverTimeout) {
              clearTimeout(targetEl._hoverTimeout);
            }

            // 500ms後にプレビュー表示
            targetEl._hoverTimeout = setTimeout(() => {
              showPreview(pageId, target);
            }, 500);
          }
        }
        return false;
      },
      mouseout(view, event) {
        const target = event.target as HTMLElement;
        if (target.tagName === "A" && target.hasAttribute("data-page-id")) {
          // 表示タイムアウトをクリア
          const targetEl = target as HTMLElement & {
            _hoverTimeout?: NodeJS.Timeout;
          };
          if (targetEl._hoverTimeout) {
            clearTimeout(targetEl._hoverTimeout);
            targetEl._hoverTimeout = undefined;
          }

          // 200ms後にプレビューを非表示（マウスが戻ってくる可能性を考慮）
          if (hidePreviewTimeout) {
            clearTimeout(hidePreviewTimeout);
          }
          hidePreviewTimeout = setTimeout(() => {
            hidePreview();
            hidePreviewTimeout = null;
          }, 200);
        }
        return false;
      },
    },
  },
});

// プレビュー表示用のグローバル関数
let globalTip: Instance<Props> | null = null;
let globalReactRoot: ReturnType<typeof createRoot> | null = null;
let globalContainer: HTMLElement | null = null;
let currentPageId: string | null = null;

function showPreview(pageId: string, referenceElement: HTMLElement) {
  // 同じページの場合は何もしない
  if (currentPageId === pageId && globalTip) {
    return;
  }

  currentPageId = pageId;

  // コンテナを再利用または作成
  if (!globalContainer) {
    globalContainer = document.createElement("div");
    globalContainer.className = "preview-container";
    globalReactRoot = createRoot(globalContainer);
  }

  // 統一されたコンポーネントで初期表示（ローディング状態）
  if (globalReactRoot) {
    globalReactRoot.render(
      React.createElement(PageLinkPreviewCard, {
        preview: null,
        isLoading: true,
        error: undefined,
      })
    );
  }

  // tippy.jsインスタンスを再利用または作成
  if (!globalTip) {
    globalTip = tippy(referenceElement, {
      trigger: "manual",
      interactive: false,
      placement: "top-start",
      arrow: true,
      theme: "light",
      maxWidth: 320,
      content: globalContainer,
      animation: false, // アニメーション無効化
      duration: 0, // 即座に表示
    });
  } else {
    // 既存のtippyインスタンスの参照要素を更新
    globalTip.setProps({
      getReferenceClientRect: () => referenceElement.getBoundingClientRect(),
    });
  }

  globalTip.show();

  // データを取得してプレビューを更新
  pagePreviewService
    .getPreview(pageId)
    .then((preview) => {
      // ページIDが変わっていないかチェック
      if (currentPageId === pageId && globalReactRoot) {
        // 同じコンポーネントのpropsだけ更新
        globalReactRoot.render(
          React.createElement(PageLinkPreviewCard, {
            preview,
            isLoading: false,
            error: undefined,
          })
        );
      }
    })
    .catch((error) => {
      // ページIDが変わっていないかチェック
      if (currentPageId === pageId && globalReactRoot) {
        const errorMessage =
          error instanceof Error ? error.message : "読み込みに失敗しました";
        // 同じコンポーネントでエラー状態に更新
        globalReactRoot.render(
          React.createElement(PageLinkPreviewCard, {
            preview: null,
            isLoading: false,
            error: errorMessage,
          })
        );
      }
    });
}

function hidePreview() {
  if (globalTip) {
    globalTip.hide();
    // DOM要素は再利用のため破棄しない
  }
  currentPageId = null;
  // ReactルートとコンテナはreasonableTimeまで保持
}

// ブラケットリンク用のExtension
export const PageLink = Extension.create({
  name: "pageLink",
  addOptions() {
    return {
      noteSlug: null as string | null,
    };
  },
  addProseMirrorPlugins() {
    const { noteSlug } = this.options;
    return [
      bracketPlugin,
      existencePlugin,
      suggestionPlugin,
      previewPlugin,
      new Plugin({
        key: pageLinkPluginKey,
        props: {
          handleClick: (view, pos, event) => {
            console.log("🔗 PageLink: handleClickが呼ばれました", {
              pos,
              event,
              target: event.target,
            });
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

            const parsedContent = parseBracketContent(bracketContent);

            if (parsedContent.isIcon) {
              // アイコンクリック時の処理
              console.log("🔗 PageLink: アイコンクリック検出", {
                userSlug: parsedContent.slug,
                noteSlug,
              });

              // ユーザーページに遷移
              (async () => {
                try {
                  const supabase = createClient();
                  const { data: account, error: accountError } = await supabase
                    .from("accounts")
                    .select("id")
                    .eq("user_slug", parsedContent.slug)
                    .single();

                  if (accountError || !account) {
                    toast.error(
                      `ユーザー "${parsedContent.slug}" が見つかりません`
                    );
                    return;
                  }

                  const { data: page, error: pageError } = await supabase
                    .from("pages")
                    .select("id")
                    .eq("user_id", account.id)
                    .eq("title", parsedContent.slug)
                    .single();

                  if (pageError || !page) {
                    toast.error("ユーザーページが見つかりません");
                    return;
                  }

                  // ノートコンテキストに応じた遷移
                  if (noteSlug) {
                    window.location.href = `/notes/${encodeURIComponent(
                      noteSlug
                    )}/${page.id}`;
                  } else {
                    window.location.href = `/pages/${page.id}`;
                  }
                } catch (error) {
                  console.error("アイコンクリック処理エラー:", error);
                  toast.error("ページ遷移に失敗しました");
                }
              })();

              return true;
            }

            console.log("🔗 PageLink: ブラケットリンククリック検出", {
              bracketContent,
              noteSlug,
            });

            // Convert underscores to spaces for page title search and creation
            const searchTitle = parsedContent.slug.replace(/_/g, " ");

            // 外部リンクかどうかをチェック
            if (parsedContent.type === "external") {
              console.log("🔗 PageLink: 外部リンクとして処理");
              window.open(parsedContent.slug, "_blank");
              return true;
            }

            // 内部リンクの処理
            console.log("🔗 PageLink: 内部リンクとして処理開始", {
              searchTitle,
              noteSlug,
            });
            (async () => {
              try {
                console.log("🔗 PageLink: Supabaseクライアント作成");
                const supabase = createClient();
                const {
                  data: { user },
                  error: authError,
                } = await supabase.auth.getUser();
                console.log("🔗 PageLink: ユーザー認証確認", {
                  user: !!user,
                  authError,
                });
                if (authError || !user) {
                  toast.error("ログインしてください");
                  return;
                }

                console.log("🔗 PageLink: ページ検索開始", { searchTitle });
                const { data: pages, error: searchError } = await supabase
                  .from("pages")
                  .select("id")
                  .eq("title", searchTitle)
                  .limit(1);
                console.log("🔗 PageLink: ページ検索結果", {
                  pages,
                  searchError,
                });
                if (searchError) {
                  console.error("ページの検索に失敗しました:", searchError);
                  toast.error("ページの検索に失敗しました");
                  return;
                }

                let pageId: string;
                if (pages && pages.length > 0) {
                  console.log("🔗 PageLink: 既存ページを発見");
                  pageId = pages[0].id;
                } else {
                  console.log("🔗 PageLink: 新規ページ作成開始");
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

                  // noteSlugが指定されている場合はnoteに関連付け
                  if (noteSlug) {
                    // noteIDを取得
                    const { data: note, error: noteError } = await supabase
                      .from("notes")
                      .select("id")
                      .eq("slug", noteSlug)
                      .single();

                    if (!noteError && note) {
                      // note_page_linksに挿入
                      const { error: linkError } = await supabase
                        .from("note_page_links")
                        .insert({ note_id: note.id, page_id: pageId });

                      if (linkError) {
                        console.error("ページのnote関連付けに失敗:", linkError);
                      }
                    }
                  }

                  toast.success(`新しいページ「${searchTitle}」を作成しました`);
                }

                // 適切なURLに遷移
                if (noteSlug && pages?.length === 0) {
                  // 新規作成されたページでnoteコンテキストの場合
                  window.location.href = `/notes/${encodeURIComponent(
                    noteSlug
                  )}/${pageId}?newPage=true`;
                } else if (noteSlug) {
                  // 既存ページでnoteコンテキストの場合
                  window.location.href = `/notes/${encodeURIComponent(
                    noteSlug
                  )}/${pageId}`;
                } else {
                  // 通常のページコンテキスト
                  window.location.href = `/pages/${pageId}?newPage=${
                    pages?.length === 0
                  }`;
                }
                console.log("🔗 PageLink: 処理完了");
              } catch (error) {
                console.error("🔗 PageLink: エラーが発生しました:", error);
                toast.error(
                  `ページ処理中にエラーが発生しました: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
              }
            })();

            return true;
          },
          // Intercept DOM click on <a> tags to perform navigation
          handleDOMEvents: {
            click(view, event) {
              console.log("🔗 PageLink: DOMクリック検出", {
                event,
                target: event.target,
                tagName: (event.target as HTMLElement)?.tagName,
              });
              const target = event.target as HTMLAnchorElement;
              if (target.tagName === "A") {
                // Create and navigate for new-page links
                const newTitle = target.getAttribute("data-page-title");
                if (newTitle) {
                  event.preventDefault();
                  // Convert underscores to spaces for new page title
                  const titleWithSpaces = newTitle.replace(/_/g, " ");
                  (async () => {
                    try {
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
                      const { data: newPage, error: insertError } =
                        await supabase
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

                      // noteSlugが指定されている場合はnoteに関連付け
                      if (noteSlug) {
                        // noteIDを取得
                        const { data: note, error: noteError } = await supabase
                          .from("notes")
                          .select("id")
                          .eq("slug", noteSlug)
                          .single();

                        if (!noteError && note) {
                          // note_page_linksに挿入
                          const { error: linkError } = await supabase
                            .from("note_page_links")
                            .insert({ note_id: note.id, page_id: newPage.id });

                          if (linkError) {
                            console.error(
                              "ページのnote関連付けに失敗:",
                              linkError
                            );
                          }
                        }

                        window.location.href = `/notes/${encodeURIComponent(
                          noteSlug
                        )}/${newPage.id}?newPage=true`;
                      } else {
                        window.location.href = `/pages/${newPage.id}?newPage=true`;
                      }
                    } catch (error) {
                      console.error(
                        "🔗 PageLink DOM: エラーが発生しました:",
                        error
                      );
                      toast.error(
                        `ページ作成中にエラーが発生しました: ${
                          error instanceof Error ? error.message : String(error)
                        }`
                      );
                    }
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
