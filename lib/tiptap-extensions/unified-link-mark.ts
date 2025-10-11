/**
 * UnifiedLinkMark - 統合リンクマーク
 * [Title] と #タグ の両方を単一のマークで処理
 */

import {
  Mark,
  mergeAttributes,
  type CommandProps,
  type Editor,
} from "@tiptap/core";
import { InputRule } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { searchPages } from "../utils/searchPages";
import {
  normalizeTitleToKey,
  getCachedPageId,
  setCachedPageId,
  AutoReconciler, // P3追加
} from "../unilink";
import {
  markPending,
  markResolved,
  markMissing,
} from "../metrics/pageLinkMetrics";
import {
  markUnifiedPending,
  markUnifiedResolved,
  markUnifiedMissing,
  markUnifiedError,
  markUnifiedCacheHit,
} from "../unilink/metrics";
import { navigateToPage, handleMissingLinkClick } from "../unilink/resolver";

export interface UnifiedLinkMarkOptions {
  HTMLAttributes: Record<string, string>;
  autoReconciler?: AutoReconciler | null; // P3追加: AutoReconcilerインスタンス
  noteSlug?: string | null; // P4追加: ノートとの関連付け
  userId?: string | null; // P4追加: ユーザーID
  onShowCreatePageDialog?: (
    title: string,
    onConfirm: () => Promise<void>
  ) => void; // P4追加: ページ作成ダイアログコールバック
}

export interface UnifiedLinkAttributes {
  variant: "bracket" | "tag";
  raw: string;
  text: string;
  key: string;
  pageId?: string | null;
  href: string;
  state: "pending" | "exists" | "missing" | "error";
  exists: boolean;
  created?: boolean;
  meta?: object;
  markId: string;
}

// P3: AutoReconcilerグローバルインスタンス（エディタごとに管理）
let globalAutoReconciler: AutoReconciler | null = null;

// 解決キュー（非同期処理用）
const resolverQueue: Array<{
  key: string;
  markId: string;
  editor: Editor;
}> = [];

let isResolverRunning = false;

async function processResolverQueue() {
  if (isResolverRunning) return;
  isResolverRunning = true;

  while (resolverQueue.length > 0) {
    const batch = resolverQueue.splice(0, 10); // バッチで処理

    for (const { key, markId, editor } of batch) {
      try {
        // メトリクス: pending開始（基本+Unified）
        markPending(markId, key);
        markUnifiedPending(markId, key, "bracket"); // TODO: variantを正しく取得

        // キャッシュチェック
        const cachedPageId = getCachedPageId(key);
        if (cachedPageId) {
          updateMarkState(editor, markId, {
            state: "exists",
            exists: true,
            pageId: cachedPageId,
            href: `/pages/${cachedPageId}`,
          });
          markResolved(markId);
          markUnifiedResolved(markId);
          markUnifiedCacheHit(markId, key);
          continue;
        }

        // 検索実行（リトライ機能付き）
        const results = await searchPagesWithRetry(key);
        const exact = results.find((r) => normalizeTitleToKey(r.title) === key);

        if (exact) {
          setCachedPageId(key, exact.id);
          updateMarkState(editor, markId, {
            state: "exists",
            exists: true,
            pageId: exact.id,
            href: `/pages/${exact.id}`,
          });
          markResolved(markId);
          markUnifiedResolved(markId);
        } else {
          updateMarkState(editor, markId, {
            state: "missing",
            exists: false,
            href: "#", // クリック処理用にhref変更
          });
          markMissing(markId);
          markUnifiedMissing(markId);
        }
      } catch (error) {
        console.warn(`Failed to resolve key "${key}":`, error);
        // エラー状態に更新
        updateMarkState(editor, markId, {
          state: "error",
        } as Partial<UnifiedLinkAttributes>);
        markUnifiedError(markId, String(error));
      }
    }

    // 次バッチまで少し待機
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  isResolverRunning = false;
}

interface SearchResult {
  id: string;
  title: string;
}

// リトライ機能付きsearchPages
async function searchPagesWithRetry(
  key: string,
  maxRetries = 2
): Promise<SearchResult[]> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await searchPages(key);
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        // 指数バックオフ: 100ms, 200ms, 400ms...
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** i));
      }
    }
  }

  throw lastError;
}

function updateMarkState(
  editor: Editor,
  markId: string,
  updates: Partial<UnifiedLinkAttributes>
) {
  try {
    const { state, dispatch } = editor.view;
    if (!state || !dispatch) {
      console.warn("Editor state or dispatch not available");
      return;
    }

    const { tr } = state;
    const markType = state.schema.marks.unilink;
    let changed = false;

    state.doc.descendants((node, pos: number) => {
      if (!node.isText || !node.text) return;

      for (const mark of node.marks) {
        if (mark.type === markType && mark.attrs.markId === markId) {
          const newAttrs = { ...mark.attrs, ...updates };

          // exists フラグを state と同期
          if (updates.state) {
            newAttrs.exists = updates.state === "exists";
          }

          tr.removeMark(pos, pos + node.text.length, markType);
          tr.addMark(pos, pos + node.text.length, markType.create(newAttrs));
          changed = true;
        }
      }
    });

    if (changed) {
      dispatch(tr);
    }
  } catch (error) {
    console.error("Failed to update mark state:", error);
  }
}

function generateMarkId(): string {
  return `unilink-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
  name: "unilink",
  priority: 1000,
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "unilink underline cursor-pointer",
      },
      autoReconciler: null, // P3追加: デフォルトはnull
      noteSlug: null, // P4追加: デフォルトはnull
      userId: null, // P4追加: デフォルトはnull
      onShowCreatePageDialog: undefined, // P4追加: デフォルトは未定義
    };
  },

  // P3追加: エディタ作成時にAutoReconcilerを初期化
  onCreate() {
    if (this.editor && !globalAutoReconciler) {
      console.log("[UnifiedLinkMark] Initializing AutoReconciler...");
      globalAutoReconciler = new AutoReconciler(this.editor);
      // TODO: Supabase channelの取得と設定
      globalAutoReconciler.initialize();
    }
  },

  // P3追加: エディタ破棄時にAutoReconcilerをクリーンアップ
  onDestroy() {
    if (globalAutoReconciler) {
      console.log("[UnifiedLinkMark] Destroying AutoReconciler...");
      globalAutoReconciler.destroy();
      globalAutoReconciler = null;
    }
  },

  addAttributes() {
    return {
      variant: {
        default: "bracket",
        parseHTML: (element) =>
          element.getAttribute("data-variant") || "bracket",
        renderHTML: (attributes) => ({ "data-variant": attributes.variant }),
      },
      raw: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-raw") || "",
        renderHTML: (attributes) => ({ "data-raw": attributes.raw }),
      },
      text: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-text") || "",
        renderHTML: (attributes) => ({ "data-text": attributes.text }),
      },
      key: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-key") || "",
        renderHTML: (attributes) => ({ "data-key": attributes.key }),
      },
      pageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-page-id"),
        renderHTML: (attributes) =>
          attributes.pageId ? { "data-page-id": attributes.pageId } : {},
      },
      href: {
        default: "#",
        parseHTML: (element) => element.getAttribute("href") || "#",
        renderHTML: (attributes) => ({ href: attributes.href }),
      },
      state: {
        default: "pending",
        parseHTML: (element) => element.getAttribute("data-state") || "pending",
        renderHTML: (attributes) => ({ "data-state": attributes.state }),
      },
      exists: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-exists") === "true",
        renderHTML: (attributes) => ({
          "data-exists": String(attributes.exists),
        }),
      },
      created: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-created") === "true",
        renderHTML: (attributes) =>
          attributes.created ? { "data-created": "true" } : {},
      },
      markId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mark-id") || "",
        renderHTML: (attributes) => ({ "data-mark-id": attributes.markId }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { variant, ...rest } = HTMLAttributes;
    const variantClass = `unilink--${variant}`;

    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, rest, {
        class: `${this.options.HTMLAttributes.class} ${variantClass}`,
      }),
      0,
    ];
  },

  parseHTML() {
    return [
      {
        tag: "a[data-variant]",
      },
    ];
  },

  addCommands() {
    return {
      insertUnifiedLink:
        (attrs: Partial<UnifiedLinkAttributes>) =>
        ({ state, dispatch }) => {
          const { selection } = state;
          const { from, to } = selection;

          const markId = generateMarkId();
          const key = normalizeTitleToKey(attrs.raw || "");

          const fullAttrs: UnifiedLinkAttributes = {
            variant: attrs.variant || "bracket",
            raw: attrs.raw || "",
            text: attrs.text || attrs.raw || "",
            key,
            pageId: null,
            href: "#",
            state: "pending",
            exists: false,
            markId,
            ...attrs,
          };

          if (dispatch) {
            const tr = state.tr.addMark(from, to, this.type.create(fullAttrs));
            dispatch(tr);

            // 解決キューに追加
            resolverQueue.push({
              key,
              markId,
              editor: this.editor,
            });

            // 非同期で解決開始
            queueMicrotask(() => processResolverQueue());
          }

          return true;
        },

      refreshUnifiedLinks:
        () =>
        ({ state, dispatch }) => {
          const markType = this.type;
          const toRefresh: Array<{ key: string; markId: string }> = [];

          state.doc.descendants((node) => {
            if (!node.isText) return;

            for (const mark of node.marks) {
              if (mark.type === markType && mark.attrs.state !== "exists") {
                toRefresh.push({
                  key: mark.attrs.key,
                  markId: mark.attrs.markId,
                });
              }
            }
          });

          // キューに追加
          for (const { key, markId } of toRefresh) {
            resolverQueue.push({
              key,
              markId,
              editor: this.editor,
            });
          }

          queueMicrotask(() => processResolverQueue());

          return true;
        },
    };
  },

  addInputRules() {
    return [
      // Tag variant: #タグ
      new InputRule({
        find: /\B#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]{1,50})$/,
        handler: ({ state, match, range, chain }) => {
          // コードコンテキスト抑制
          const $from = state.selection.$from;
          if (
            $from.parent.type.name === "codeBlock" ||
            $from.marks().some((m) => m.type.name === "code")
          ) {
            return null;
          }

          const raw = match[1];
          const text = raw; // タグは # を表示しない
          const key = normalizeTitleToKey(raw);
          const markId = generateMarkId();

          const attrs: UnifiedLinkAttributes = {
            variant: "tag",
            raw,
            text,
            key,
            pageId: null,
            href: "#",
            state: "pending",
            exists: false,
            markId,
          };

          const { from, to } = range;

          // チェーンAPIを使用してマークを適用
          chain()
            .focus()
            .deleteRange({ from, to })
            .insertContent({
              type: "text",
              text: text,
              marks: [
                {
                  type: this.name,
                  attrs,
                },
              ],
            })
            .run();

          // 解決キューに追加
          resolverQueue.push({
            key,
            markId,
            editor: this.editor,
          });

          queueMicrotask(() => processResolverQueue());
        },
      }),

      // Bracket variant: [Title]
      new InputRule({
        find: /\[([^\[\]]+)\]$/,
        handler: ({ state, match, range, chain }) => {
          // コードコンテキスト抑制
          const $from = state.selection.$from;
          if (
            $from.parent.type.name === "codeBlock" ||
            $from.marks().some((m) => m.type.name === "code")
          ) {
            return null;
          }

          const raw = match[1];
          const text = raw;
          const key = normalizeTitleToKey(raw);
          const markId = generateMarkId();

          // 外部リンクチェック
          const isExternal = /^https?:\/\//.test(raw);

          const { from, to } = range;

          const attrs: UnifiedLinkAttributes = {
            variant: "bracket",
            raw,
            text,
            key,
            pageId: isExternal ? null : null,
            href: isExternal ? raw : "#",
            state: isExternal ? "exists" : "pending",
            exists: isExternal,
            markId,
          };

          // チェーンAPIを使用してマークを適用
          chain()
            .focus()
            .deleteRange({ from, to })
            .insertContent({
              type: "text",
              text: text,
              marks: [
                {
                  type: this.name,
                  attrs,
                },
              ],
            })
            .run();

          // 外部リンクでなければ解決キューに追加
          if (!isExternal) {
            resolverQueue.push({
              key,
              markId,
              editor: this.editor,
            });

            queueMicrotask(() => processResolverQueue());
          }
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      // Auto-close bracket plugin
      new Plugin({
        key: new PluginKey("unifiedLinkAutoBracket"),
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
              const after = state.doc.textBetween(to, paraEnd);

              if (/^\s*$/.test(after)) {
                // No trailing text, auto-close
                const tr = state.tr.insertText("[]", from, to);
                // Set cursor inside brackets
                tr.setSelection(TextSelection.create(tr.doc, from + 1));
                dispatch(tr);
                return true;
              }
            }

            return false;
          },
        },
      }),
      // Click handler plugin
      new Plugin({
        key: new PluginKey("unifiedLinkClickHandler"),
        props: {
          handleClick: (view, pos, event) => {
            const { state } = view;
            const { doc } = state;
            const $pos = doc.resolve(pos);

            // クリックされた位置にunilinkマークがあるかチェック
            const unilinkMark = $pos
              .marks()
              .find((mark) => mark.type.name === "unilink");

            if (!unilinkMark) {
              return false; // unilinkマークではない場合は処理しない
            }

            event.preventDefault();
            const attrs = unilinkMark.attrs as UnifiedLinkAttributes;

            console.log(
              `[UnifiedLinkMark] Click: state=${attrs.state}, pageId=${attrs.pageId}, text=${attrs.text}`
            );

            if (attrs.state === "exists" && attrs.pageId) {
              // 既存ページへのナビゲーション
              navigateToPage(attrs.pageId);
            } else if (
              attrs.state === "missing" &&
              attrs.text &&
              attrs.markId
            ) {
              // missing状態からのページ作成フロー
              handleMissingLinkClick(
                this.editor,
                attrs.markId,
                attrs.text,
                this.options.userId || undefined,
                this.options.onShowCreatePageDialog
              );
            } else if (attrs.state === "pending") {
              // pending状態では何もしない
              console.log("[UnifiedLinkMark] Link is still resolving...");
            } else {
              console.warn(
                "[UnifiedLinkMark] Unknown state or missing data:",
                attrs
              );
            }

            return true; // イベントを処理したことを示す
          },
        },
      }),
    ];
  },
});
