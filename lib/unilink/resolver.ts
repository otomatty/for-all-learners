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
 * @returns 作成されたページID、失敗時はnull
 */
export async function createPageFromMark(
  editor: Editor,
  markId: string,
  title: string,
  userId?: string
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
    } else {
      throw new Error("Page creation returned no ID");
    }
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

    state.doc.descendants((node: any, pos: number) => {
      if (!node.isText) return;

      node.marks.forEach((mark: any) => {
        if (mark.type === markType && mark.attrs.markId === markId) {
          const newAttrs: UnifiedLinkAttributes = {
            ...mark.attrs,
            state: "exists",
            exists: true,
            pageId,
            href: `/pages/${pageId}`,
            created: true, // 新規作成フラグ
          };

          tr.removeMark(pos, pos + node.text.length, markType);
          tr.addMark(pos, pos + node.text.length, markType.create(newAttrs));
          changed = true;
        }
      });
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
 * @param editor TipTapエディタインスタンス
 * @param markId 対象マークのID
 * @param title ページタイトル
 * @param userId ユーザーID
 */
export async function handleMissingLinkClick(
  editor: Editor,
  markId: string,
  title: string,
  userId?: string
): Promise<void> {
  const confirmed = confirm(
    `「${title}」というページは存在しません。新しく作成しますか？`
  );

  if (confirmed) {
    const pageId = await createPageFromMark(editor, markId, title, userId);
    if (pageId) {
      navigateToPage(pageId);
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
