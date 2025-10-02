/**
 * AutoReconciler - リアルタイム自動再解決の統合ロジック
 * P3実装: BroadcastChannel、Realtime、Visibility/Onlineの統合
 */

import type { Editor } from "@tiptap/core";
import { searchPages } from "../utils/searchPages";
import { getCachedPageId, setCachedPageId } from "./utils";
import { ReconcileQueue } from "./reconcile-queue";
import { MarkIndex } from "./mark-index";
import { UnilinkBroadcastChannel } from "./broadcast-channel";
import { UnilinkRealtimeListener } from "./realtime-listener";
import type { RealtimeChannel } from "@supabase/supabase-js";

export class AutoReconciler {
  private editor: Editor;
  private markIndex: MarkIndex;
  private reconcileQueue: ReconcileQueue;
  private broadcastChannel: UnilinkBroadcastChannel;
  private realtimeListener: UnilinkRealtimeListener;
  private visibilityHandler: (() => void) | null = null;
  private onlineHandler: (() => void) | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.markIndex = new MarkIndex(editor);
    this.reconcileQueue = new ReconcileQueue(
      this.handleReconcile.bind(this),
      100 // 100ms debounce
    );
    this.broadcastChannel = new UnilinkBroadcastChannel();
    this.realtimeListener = new UnilinkRealtimeListener();
  }

  /**
   * リアルタイム機能を初期化
   */
  initialize(supabaseChannel?: RealtimeChannel): void {
    console.log("[AutoReconciler] Initializing realtime features...");

    // MarkIndexを初期構築
    this.markIndex.rebuild();

    // BroadcastChannelリスナー登録
    this.broadcastChannel.onPageCreated((message) => {
      console.log(
        `[AutoReconciler] BroadcastChannel received: key="${message.key}", pageId="${message.pageId}"`
      );
      this.reconcileQueue.enqueue(message.key, message.pageId);
    });

    // Realtime リスナー登録
    if (supabaseChannel) {
      this.realtimeListener.setupChannel(supabaseChannel);
      this.realtimeListener.onPageCreated((key, pageId) => {
        console.log(
          `[AutoReconciler] Realtime received: key="${key}", pageId="${pageId}"`
        );
        this.reconcileQueue.enqueue(key, pageId);
      });
    }

    // Visibility/Online イベントリスナー
    this.setupVisibilityHandlers();

    console.log("[AutoReconciler] Initialization complete");
  }

  /**
   * ReconcileQueueからのコールバック処理
   */
  private async handleReconcile(key: string, pageId?: string): Promise<void> {
    try {
      console.log(`[AutoReconciler] Reconciling key="${key}"`);

      // キャッシュチェック
      const cached = getCachedPageId(key);
      if (cached) {
        console.log(`[AutoReconciler] Cache hit for key="${key}"`);
        this.markIndex.rebuild();
        this.markIndex.updateToExists(key, cached);
        return;
      }

      // pageIdが提供されていない場合は検索
      let resolvedPageId = pageId;
      if (!resolvedPageId) {
        const results = await searchPages(key);
        if (results && results.length > 0) {
          // 完全一致を優先
          const exactMatch = results.find(
            (page) => page.title.toLowerCase() === key.toLowerCase()
          );
          resolvedPageId = exactMatch ? exactMatch.id : results[0].id;
        }
      }

      if (!resolvedPageId) {
        console.log(`[AutoReconciler] No page found for key="${key}"`);
        return;
      }

      // キャッシュに保存
      setCachedPageId(key, resolvedPageId);

      // MarkIndexを更新してマークをexists状態に
      this.markIndex.rebuild();
      const updated = this.markIndex.updateToExists(key, resolvedPageId);

      if (updated) {
        console.log(
          `[AutoReconciler] Successfully reconciled key="${key}" to pageId="${resolvedPageId}"`
        );
      }
    } catch (error) {
      console.error(
        `[AutoReconciler] Failed to reconcile key="${key}":`,
        error
      );
    }
  }

  /**
   * Visibility/Onlineイベントハンドラを設定
   */
  private setupVisibilityHandlers(): void {
    if (typeof window === "undefined") return;

    // Visibility change (タブがアクティブになった時)
    this.visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[AutoReconciler] Tab became visible, triggering reconcile"
        );
        this.reconcileStaleKeys();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);

    // Online (オンライン復帰時)
    this.onlineHandler = () => {
      console.log("[AutoReconciler] Network online, triggering reconcile");
      this.reconcileStaleKeys();
    };
    window.addEventListener("online", this.onlineHandler);
  }

  /**
   * Stale keys（期限切れキャッシュのmissingマーク）を再解決
   */
  private async reconcileStaleKeys(): Promise<void> {
    try {
      // MarkIndexを再構築
      this.markIndex.rebuild();

      // 全てのmissing keyを取得
      const keys = this.markIndex.getAllKeys();

      if (keys.length === 0) {
        console.log("[AutoReconciler] No stale keys to reconcile");
        return;
      }

      console.log(`[AutoReconciler] Reconciling ${keys.length} stale keys...`);

      // 各keyを個別にキューに追加（デバウンスされる）
      keys.forEach((key) => {
        this.reconcileQueue.enqueue(key);
      });
    } catch (error) {
      console.error("[AutoReconciler] Failed to reconcile stale keys:", error);
    }
  }

  /**
   * 手動で特定のkeyを再解決
   */
  async reconcileKey(key: string): Promise<void> {
    this.reconcileQueue.enqueue(key);
  }

  /**
   * デバッグ用: 現在の状態を取得
   */
  getStats(): {
    markIndex: ReturnType<MarkIndex["getStats"]>;
    queueSize: number;
  } {
    return {
      markIndex: this.markIndex.getStats(),
      queueSize: this.reconcileQueue.getQueueSize(),
    };
  }

  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    console.log("[AutoReconciler] Destroying...");

    this.reconcileQueue.clear();
    this.markIndex.clear();
    this.broadcastChannel.close();
    this.realtimeListener.close();

    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.onlineHandler) {
      window.removeEventListener("online", this.onlineHandler);
      this.onlineHandler = null;
    }

    console.log("[AutoReconciler] Destroyed");
  }
}
