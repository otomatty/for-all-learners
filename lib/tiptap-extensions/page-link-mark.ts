import {
  Mark,
  mergeAttributes,
  type CommandProps,
  type Command,
} from "@tiptap/core";
import { InputRule } from "@tiptap/core";
import { searchPages } from "@/lib/utils/searchPages";
import {
  markPending,
  markResolved,
  markMissing,
} from "@/lib/metrics/pageLinkMetrics";
import { Plugin, PluginKey } from "prosemirror-state";

// PageLinkMark: ブラケット記法由来のページ/外部リンクを Mark 化する第一段階
// まだ自動変換（[Title] -> Mark）のロジックは入れず、Decoration 版との共存検証用
export interface PageLinkMarkOptions {
  HTMLAttributes: Record<string, any>;
}

export interface PageLinkAttributes {
  href: string;
  pageId?: string | null;
  pageTitle?: string; // 未作成ページ時のタイトル保持
  external?: boolean;
  plId?: string; // 一意ID (非同期更新用)
  exists?: boolean; // 解決結果
  state?: string; // 'pending' | 'exists' | 'missing'
}

export const PageLinkMark = Mark.create<PageLinkMarkOptions>({
  name: "pageLinkMark",
  priority: 1000, // strong より前に出力させ <a><strong>... にしたい場合は strong より高め
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {
        // 色は data-state 用の CSS による制御へ委譲し、固有クラスでターゲットしやすくする
        class: "page-link-mark underline cursor-pointer",
      },
    };
  },

  addAttributes() {
    return {
      href: {
        default: null,
      },
      pageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-page-id"),
        renderHTML: (attributes) =>
          attributes.pageId ? { "data-page-id": attributes.pageId } : {},
      },
      pageTitle: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-page-title"),
        renderHTML: (attributes) =>
          attributes.pageTitle
            ? { "data-page-title": attributes.pageTitle }
            : {},
      },
      external: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-external") === "true",
        renderHTML: (attributes) =>
          attributes.external
            ? {
                "data-external": "true",
                rel: "noopener noreferrer",
                target: "_blank",
              }
            : {},
      },
      plId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-pl-id"),
        renderHTML: (attributes) =>
          attributes.plId ? { "data-pl-id": attributes.plId } : {},
      },
      exists: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute("data-exists");
          return v === null ? null : v === "true";
        },
        renderHTML: (attributes) =>
          typeof attributes.exists === "boolean"
            ? { "data-exists": String(attributes.exists) }
            : {},
      },
      state: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-state"),
        renderHTML: (attributes) =>
          attributes.state ? { "data-state": attributes.state } : {},
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { external, ...rest } = HTMLAttributes;
    return ["a", mergeAttributes(this.options.HTMLAttributes, rest), 0];
  },

  parseHTML() {
    return [
      {
        tag: "a[data-page-id], a[data-page-title], a[data-external]",
      },
    ];
  },

  addCommands() {
    const setPageLink: any =
      (attrs: PageLinkAttributes) =>
      ({ chain }: CommandProps) =>
        chain().setMark(this.name, attrs).run();
    const togglePageLink: any =
      (attrs: PageLinkAttributes) =>
      ({ chain }: CommandProps) =>
        chain().toggleMark(this.name, attrs).run();
    const unsetPageLink: any =
      () =>
      ({ chain }: CommandProps) =>
        chain().unsetMark(this.name).run();

    // 未存在(missing)リンクからページを作成する想定のコマンド（UI側でページ生成API呼び出し後、ID受領して適用）
    const createPageFromLink: any =
      (pageId: string, href?: string) =>
      ({ state, dispatch }: CommandProps) => {
        const { tr } = state;
        const markType = state.schema.marks[this.name];
        let changed = false;
        state.doc.descendants((node, pos) => {
          if (!node.isText) return false;
          const len = node.text?.length || 0;
          node.marks.forEach((m) => {
            if (
              m.type === markType &&
              m.attrs.state === "missing" &&
              m.attrs.href === "#"
            ) {
              const newMark = markType.create({
                ...m.attrs,
                pageId,
                href: href || `/pages/${pageId}`,
                exists: true,
                state: "exists",
              });
              tr.removeMark(pos, pos + len, markType);
              tr.addMark(pos, pos + len, newMark);
              changed = true;
            }
          });
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };

    // 既存リンクの属性を更新（タイトル変更など）
    const updatePageLink: any =
      (updater: (attrs: PageLinkAttributes) => PageLinkAttributes) =>
      ({ state, dispatch }: CommandProps) => {
        const { tr } = state;
        const markType = state.schema.marks[this.name];
        let changed = false;
        state.doc.descendants((node, pos) => {
          if (!node.isText) return false;
          const len = node.text?.length || 0;
          node.marks.forEach((m) => {
            if (m.type === markType) {
              const next = updater(m.attrs as PageLinkAttributes);
              const newMark = markType.create(next);
              tr.removeMark(pos, pos + len, markType);
              tr.addMark(pos, pos + len, newMark);
              changed = true;
            }
          });
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };

    // pending / missing のリンクを再検索して再解決する
    const refreshPageLinkMarks: any =
      () =>
      ({ state, dispatch }: CommandProps) => {
        const markType = state.schema.marks[this.name];
        const targets: Array<{
          title: string;
          pos: number;
          len: number;
          plId: string;
          currentState: string;
        }> = [];
        state.doc.descendants((node: any, pos: number) => {
          if (!node.isText) return false;
          const len = node.text?.length || 0;
          node.marks.forEach((m: any) => {
            if (
              m.type === markType &&
              (m.attrs.state === "pending" || m.attrs.state === "missing") &&
              m.attrs.href === "#" &&
              m.attrs.pageTitle &&
              m.attrs.plId
            ) {
              targets.push({
                title: m.attrs.pageTitle as string,
                pos,
                len,
                plId: m.attrs.plId as string,
                currentState: m.attrs.state as string,
              });
            }
          });
        });
        if (!targets.length) return false;
        // 非同期一括処理（現状: 各タイトル個別検索; 将来: batched API）
        targets.forEach((t) => {
          markPending(t.plId, t.title);
          searchPages(t.title)
            .then((results) => {
              const exact = results.find((r) => r.title === t.title);
              const view =
                (dispatch as any)?.view || (state as any)?.view || undefined;
              const curState = view?.state || state;
              const tr = curState.tr;
              let updated = false;
              curState.doc.nodesBetween(
                t.pos,
                t.pos + t.len,
                (node: any, pos: number) => {
                  if (!node.isText) return;
                  node.marks.forEach((m: any) => {
                    if (
                      m.type === markType &&
                      m.attrs.plId === t.plId &&
                      (m.attrs.state === "pending" ||
                        m.attrs.state === "missing")
                    ) {
                      tr.removeMark(pos, pos + node.text!.length, markType);
                      if (!exact) {
                        tr.addMark(
                          pos,
                          pos + node.text!.length,
                          markType.create({
                            ...m.attrs,
                            exists: false,
                            state: "missing",
                          })
                        );
                        updated = true;
                      } else {
                        tr.addMark(
                          pos,
                          pos + node.text!.length,
                          markType.create({
                            ...m.attrs,
                            href: `/pages/${exact.id}`,
                            pageId: exact.id,
                            exists: true,
                            state: "exists",
                          })
                        );
                        updated = true;
                      }
                    }
                  });
                }
              );
              if (updated && dispatch) dispatch(tr);
              if (!exact) markMissing(t.plId);
              else markResolved(t.plId);
            })
            .catch(() => {});
        });
        return true;
      };

    return {
      setPageLink,
      togglePageLink,
      unsetPageLink,
      createPageFromLink,
      updatePageLink,
      refreshPageLinkMarks,
    } as Partial<Record<string, Command>>;
  },
  addInputRules() {
    // 末尾に `[text]` が現れたら Mark へ変換する InputRule
    const bracketRule = new InputRule({
      find: /\[([^\[\]]+)\]$/,
      handler: ({ state, match, range }) => {
        // コードコンテキスト抑止
        const $from = state.selection.$from;
        if (
          $from.parent.type.name === "codeBlock" ||
          $from.marks().some((m) => m.type.name === "code")
        ) {
          return;
        }
        const title = match[1];
        const isExternal = /^https?:\/\//.test(title);
        const { from, to } = range;
        const tr = state.tr.insertText(title, from, to);
        // 一意ID生成 (軽量)
        const plId = `${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const attrs: PageLinkAttributes = {
          href: isExternal ? title : "#",
          pageTitle: !isExternal ? title : undefined,
          external: isExternal || undefined,
          plId,
          exists: isExternal ? true : undefined,
          state: isExternal ? "exists" : "pending",
        };
        tr.addMark(from, from + title.length, this.type.create(attrs));
        if (!isExternal) {
          markPending(plId, title);
        }
        if (!isExternal) {
          queueMicrotask(() => {
            searchPages(title)
              .then((results) => {
                const exact = results.find((r) => r.title === title);
                const view = this.editor.view;
                const { state: curState } = view;
                const markType = this.type;
                // 位置インデックス参照
                const index:
                  | Map<string, { from: number; to: number }>
                  | undefined = pageLinkMarkIndexKey.getState(curState);
                const loc = index?.get(plId);
                const applyUpdate = (update: {
                  exists: boolean;
                  state: string;
                  href: string;
                  pageId?: string;
                }) => {
                  const visitRange = (
                    from: number,
                    to: number,
                    strict: boolean
                  ) => {
                    let applied = false;
                    curState.doc.nodesBetween(from, to, (node, pos) => {
                      if (!node.isText) return;
                      const has = node.marks.find(
                        (m) =>
                          m.type === markType &&
                          m.attrs.plId === plId &&
                          m.attrs.state === "pending" &&
                          m.attrs.href === "#" &&
                          m.attrs.pageTitle === title
                      );
                      if (has) {
                        applied = true;
                        const tr2 = curState.tr.removeMark(
                          pos,
                          pos + node.text!.length,
                          markType
                        );
                        tr2.addMark(
                          pos,
                          pos + node.text!.length,
                          markType.create({
                            href: update.href,
                            pageId: update.pageId,
                            pageTitle: title,
                            plId,
                            exists: update.exists,
                            state: update.state,
                          })
                        );
                        view.dispatch(tr2);
                      }
                    });
                    return applied;
                  };

                  // 1. インデックス範囲を優先
                  if (loc) {
                    const ok = visitRange(loc.from, loc.to, true);
                    if (ok) return true;
                  }
                  // 2. Fallback: ドキュメント全域軽量走査 (pending は短命なので件数は少ない想定)
                  return visitRange(0, curState.doc.content.size, false);
                };

                if (!exact) {
                  const updated = applyUpdate({
                    exists: false,
                    state: "missing",
                    href: "#",
                  });
                  if (updated) markMissing(plId);
                  return;
                }
                const updated = applyUpdate({
                  exists: true,
                  state: "exists",
                  href: `/pages/${exact.id}`,
                  pageId: exact.id,
                });
                if (updated) markResolved(plId);
              })
              .catch(() => {});
          });
        }
      },
    });
    return [bracketRule];
  },
  addProseMirrorPlugins() {
    // 位置インデックス: plId -> {from,to}
    return [
      new Plugin({
        key: pageLinkMarkIndexKey,
        state: {
          init: (_, state) => buildIndex(state.doc, this.name),
          apply: (tr, value, _oldState, newState) => {
            if (!tr.docChanged) return value;
            return buildIndex(newState.doc, this.name);
          },
        },
      }),
    ];
  },
});

// Index PluginKey
const pageLinkMarkIndexKey = new PluginKey<
  Map<string, { from: number; to: number }>
>("pageLinkMarkIndex");

function buildIndex(doc: any, markName: string) {
  const map = new Map<string, { from: number; to: number }>();
  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    node.marks.forEach((m: any) => {
      if (m.type.name === markName && m.attrs.plId) {
        map.set(m.attrs.plId, {
          from: pos,
          to: pos + (node.text?.length || 0),
        });
      }
    });
  });
  return map;
}
