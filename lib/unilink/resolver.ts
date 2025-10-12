/**
 * UnifiedLinkMark Resolver - ページ作成とナビゲーション機能
 * P2実装: 解決ロジック専用のユーティリティ
 * P3追加: BroadcastChannel統合によるクロスタブ同期
 */

import { createPage } from "@/app/_actions/pages";
import { toast } from "sonner";
import type { Editor } from "@tiptap/core";
import type { UnifiedLinkAttributes } from "../tiptap-extensions/unified-link-mark";
import { UnilinkBroadcastChannel } from "./broadcast-channel";
import { normalizeTitleToKey } from "./utils";

// グローバルBroadcastChannelインスタンス（シングルトン）
let broadcastChannel: UnilinkBroadcastChannel | null = null;

/**
 * BroadcastChannelインスタンスを取得（シングルトン）
 */
function getBroadcastChannel(): UnilinkBroadcastChannel {
  if (!broadcastChannel) {
    broadcastChannel = new UnilinkBroadcastChannel();
  }
  return broadcastChannel;
}

/**
 * missing状態のマークからページを作成する
 * @param editor TipTapエディタインスタンス
 * @param markId 対象マークのID
 * @param title 作成するページのタイトル
 * @param userId ユーザーID（将来の権限チェック用）
 * @param noteSlug ノートslug（オプション、note_pagesテーブル関連付け用）
 * @returns 作成されたページID、失敗時はnull
 */
export async function createPageFromMark(
  editor: Editor,
  markId: string,
  title: string,
  userId?: string,
  noteSlug?: string
): Promise<string | null> {
  try {
    console.log(`[UnifiedResolver] Creating page: "${title}"`);

    // userIdが必要だが、現在のコンテキストで取得方法を検討が必要
    // 暫定的に、エディタからユーザーIDを取得できない場合はエラー
    if (!userId) {
      throw new Error("User ID is required for page creation");
    }

    // Server Actionでページ作成
    const newPage = await createPage({
      title,
      content_tiptap: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `# ${title}\n\n新しいページです。`,
              },
            ],
          },
        ],
      },
      user_id: userId,
      is_public: false, // デフォルトは非公開
    });

    // TODO: noteSlug が提供されている場合、note_pages テーブルに関連付け
    // if (noteSlug && newPage?.id) {
    //   await associatePageWithNote(newPage.id, noteSlug);
    // }

    if (newPage?.id) {
      console.log(`[UnifiedResolver] Page created with ID: ${newPage.id}`);

      // マークをexists状態に更新
      await updateMarkToExists(editor, markId, newPage.id, title);

      // P3: BroadcastChannelで他タブに通知
      const key = normalizeTitleToKey(title);
      const broadcast = getBroadcastChannel();
      broadcast.emitPageCreated(key, newPage.id);
      console.log(
        `[UnifiedResolver] Broadcasted page creation: key="${key}", pageId="${newPage.id}"`
      );

      toast.success(`ページ「${title}」を作成しました`);
      return newPage.id;
    }

    throw new Error("Page creation returned no ID");
  } catch (error) {
    console.error("Page creation failed:", error);
    toast.error(`ページ「${title}」の作成に失敗しました`);
    return null;
  }
}

/**
 * マークをexists状態に更新する
 * @param editor TipTapエディタインスタンス
 * @param markId 対象マークのID
 * @param pageId 作成されたページID
 * @param title ページタイトル
 */
async function updateMarkToExists(
  editor: Editor,
  markId: string,
  pageId: string,
  title: string
): Promise<void> {
  try {
    const { state, dispatch } = editor.view;
    const { tr } = state;
    const markType = state.schema.marks.unilink;
    let changed = false;

    state.doc.descendants((node, pos: number) => {
      if (!node.isText || !node.text) return;

      for (const mark of node.marks) {
        if (mark.type === markType && mark.attrs.markId === markId) {
          const newAttrs = {
            ...mark.attrs,
            state: "exists",
            exists: true,
            pageId,
            href: `/pages/${pageId}`,
            created: true, // 新規作成フラグ
          } as UnifiedLinkAttributes;

          tr.removeMark(pos, pos + node.text.length, markType);
          tr.addMark(pos, pos + node.text.length, markType.create(newAttrs));
          changed = true;
        }
      }
    });

    if (changed && dispatch) {
      dispatch(tr);
      console.log(`[UnifiedResolver] Mark updated to exists state: ${markId}`);
    }
  } catch (error) {
    console.error("Failed to update mark to exists state:", error);
  }
}

/**
 * 指定されたページIDにナビゲーションする
 * @param pageId ナビゲーション先のページID
 */
export function navigateToPage(pageId: string): void {
  try {
    // Next.js App Routerでのクライアント側ナビゲーション
    if (typeof window !== "undefined") {
      window.location.href = `/pages/${pageId}`;
    }
  } catch (error) {
    console.error("Navigation failed:", error);
    toast.error("ページの表示に失敗しました");
  }
}

/**
 * missing状態のリンククリック時の処理
 * ダイアログ表示はコールバックで委譲し、resolver層ではロジックのみ提供
 * @param editor TipTapエディタインスタンス
 * @param markId 対象マークのID
 * @param title ページタイトル
 * @param userId ユーザーID
 * @param onShowDialog ダイアログ表示コールバック（オプション）
 */
export async function handleMissingLinkClick(
  editor: Editor,
  markId: string,
  title: string,
  userId?: string,
  onShowDialog?: (title: string, onConfirm: () => Promise<void>) => void
): Promise<void> {
  const createAndNavigate = async () => {
    const pageId = await createPageFromMark(editor, markId, title, userId);
    if (pageId) {
      navigateToPage(pageId);
    }
  };

  // カスタムダイアログが提供されている場合はそれを使用
  if (onShowDialog) {
    onShowDialog(title, createAndNavigate);
  } else {
    // フォールバック: ブラウザのconfirmダイアログ
    const confirmed = confirm(
      `「${title}」というページは存在しません。新しく作成しますか？`
    );

    if (confirmed) {
      await createAndNavigate();
    }
  }
}

/**
 * 複数マークの一括解決（将来のバッチ処理用）
 * @param editor TipTapエディタインスタンス
 * @param markIds 解決対象のマークID配列
 */
export async function batchResolveMarks(
  editor: Editor,
  markIds: string[]
): Promise<void> {
  console.log(`[UnifiedResolver] Batch resolving ${markIds.length} marks`);

  // 将来実装: 複数マークの効率的な一括解決
  // 現在は個別処理のプレースホルダー
  for (const markId of markIds) {
    // 個別解決ロジックをここに追加
    console.log(`[UnifiedResolver] Processing mark: ${markId}`);
  }
}

// ========================================
// Phase 3.1: Icon Link & External Link Support
// ========================================

/**
 * .icon記法のユーザーリンクを解決する
 * [username.icon] → ユーザーページに遷移
 *
 * @param userSlug ユーザーslug (e.g., "username" from "username.icon")
 * @param noteSlug ノートslug（オプション、ノートコンテキストでの表示用）
 * @returns ページIDとhref、見つからない場合はnull
 */
export async function resolveIconLink(
  userSlug: string,
  noteSlug?: string | null
): Promise<{ pageId: string; href: string } | null> {
  try {
    console.log(`[UnifiedResolver] Resolving icon link: ${userSlug}`);

    // Dynamic import to avoid circular dependency
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    // 1. accounts テーブルから user_slug で検索
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_slug", userSlug)
      .single();

    if (accountError || !account) {
      console.warn(`[UnifiedResolver] User not found: ${userSlug}`);
      toast.error(`ユーザー "${userSlug}" が見つかりません`);
      return null;
    }

    // 2. pages テーブルからユーザーページを取得
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id")
      .eq("user_id", account.id)
      .eq("title", userSlug)
      .single();

    if (pageError || !page) {
      console.warn(`[UnifiedResolver] User page not found for: ${userSlug}`);
      toast.error("ユーザーページが見つかりません");
      return null;
    }

    // 3. noteSlug に応じた URL を生成
    const href = noteSlug
      ? `/notes/${encodeURIComponent(noteSlug)}/${page.id}`
      : `/pages/${page.id}`;

    console.log(`[UnifiedResolver] Icon link resolved: ${href}`);
    return { pageId: page.id, href };
  } catch (error) {
    console.error("[UnifiedResolver] Icon link resolution failed:", error);
    toast.error("ページ遷移に失敗しました");
    return null;
  }
}

/**
 * ブラケット内容を解析してリンク種別を判定
 * Phase 3.1: .icon サフィックスと外部リンクの検出
 *
 * @param content ブラケット内のテキスト (e.g., "Page Title", "username.icon", "https://...")
 * @returns リンク種別の情報
 */
export function parseBracketContent(content: string): {
  type: "page" | "icon" | "external";
  slug: string;
  isIcon: boolean;
  userSlug?: string;
} {
  // .icon サフィックス検知
  const iconMatch = content.match(/^(.+)\.icon$/);
  if (iconMatch) {
    return {
      type: "icon",
      slug: iconMatch[1],
      isIcon: true,
      userSlug: iconMatch[1],
    };
  }

  // 外部リンク判定 (https:// or http://)
  if (/^https?:\/\//i.test(content)) {
    return {
      type: "external",
      slug: content,
      isIcon: false,
    };
  }

  // 通常のページリンク
  return {
    type: "page",
    slug: content,
    isIcon: false,
  };
}

/**
 * 外部リンクかどうかを判定
 *
 * @param text テキスト
 * @returns 外部リンクの場合true
 */
export function isExternalLink(text: string): boolean {
  return /^https?:\/\//i.test(text);
}

/**
 * 外部リンクを新規タブで開く
 *
 * @param url 外部URL
 */
export function openExternalLink(url: string): void {
  try {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    console.error("[UnifiedResolver] Failed to open external link:", error);
    toast.error("リンクを開けませんでした");
  }
}

/**
 * ナビゲーション処理（noteSlug対応版）
 * Phase 3.1: noteSlug を考慮した統一的なナビゲーション
 *
 * @param pageId ページID
 * @param noteSlug ノートslug（オプション）
 * @param isNewPage 新規作成ページかどうか
 */
export function navigateToPageWithContext(
  pageId: string,
  noteSlug?: string | null,
  isNewPage = false
): void {
  try {
    if (typeof window !== "undefined") {
      const queryParam = isNewPage ? "?newPage=true" : "";

      const href = noteSlug
        ? `/notes/${encodeURIComponent(noteSlug)}/${pageId}${queryParam}`
        : `/pages/${pageId}${queryParam}`;

      window.location.href = href;
    }
  } catch (error) {
    console.error("[UnifiedResolver] Navigation failed:", error);
    toast.error("ページの表示に失敗しました");
  }
}
