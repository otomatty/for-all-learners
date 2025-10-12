import { pageLinkPreviewMarkPlugin } from "./page-link-preview-mark-plugin";
import { createClient } from "@/lib/supabase/client";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
// TODO(Removal Phase): Decoration ベース実装 (bracket + inline Decoration) を
//   1) PageLinkMark の InputRule & コマンドに一本化
//   2) Tag / Icon 用は専用 Mark or Node extension へ分離
//   3) 完了後: de
import { createRoot } from "react-dom/client";
import { toast } from "sonner";

// プラグインキーの作成
// NOTE: 外部で `existencePluginKey` という名前で参照していた互換性保持のためエイリアスエクスポートを追加
const pageLinkPluginKey = new PluginKey("pageLinkPlugin");
export const existencePluginKey = pageLinkPluginKey; // backward compatibility

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
    const plugins = [
      // Mark版プレビューのみ採用 (legacy previewPlugin は削除済み)
      pageLinkPreviewMarkPlugin as Plugin,
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
    ].filter(Boolean) as Plugin[];
    return plugins;
  },
});
