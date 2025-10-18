/**
 * AutoReconciler - リアルタイム自動再解決の統合ロジック
 * P3実装: BroadcastChannel、Realtime、Visibility/Onlineの統合
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Editor } from "@tiptap/core";
import logger from "../logger";
import { searchPages } from "../utils/searchPages";
import {
	createUnilinkBroadcastChannel,
	type UnilinkBroadcastChannel,
} from "./broadcast-channel";
import { createMarkIndex, type MarkIndex } from "./mark-index";
import {
	createUnilinkRealtimeListener,
	type UnilinkRealtimeListener,
} from "./realtime-listener";
import { createReconcileQueue, type ReconcileQueue } from "./reconcile-queue";
import { getCachedPageId, setCachedPageId } from "./utils";

export class AutoReconciler {
	private markIndex: MarkIndex;
	private reconcileQueue: ReconcileQueue;
	private broadcastChannel: UnilinkBroadcastChannel;
	private realtimeListener: UnilinkRealtimeListener;
	private visibilityHandler: (() => void) | null = null;
	private onlineHandler: (() => void) | null = null;

	constructor(editor: Editor) {
		this.markIndex = createMarkIndex(editor);
		this.reconcileQueue = createReconcileQueue(
			this.handleReconcile.bind(this),
			100, // 100ms debounce
		);
		this.broadcastChannel = createUnilinkBroadcastChannel();
		this.realtimeListener = createUnilinkRealtimeListener();
	}

	/**
	 * リアルタイム機能を初期化
	 */
	initialize(supabaseChannel?: RealtimeChannel): void {
		// MarkIndexを初期構築
		this.markIndex.rebuild();

		// BroadcastChannelリスナー登録
		this.broadcastChannel.onPageCreated((message) => {
			this.reconcileQueue.enqueue(message.key, message.pageId);
		});

		// Realtime リスナー登録
		if (supabaseChannel) {
			this.realtimeListener.setupChannel(supabaseChannel);
			this.realtimeListener.onPageCreated((key, pageId) => {
				this.reconcileQueue.enqueue(key, pageId);
			});
		}

		// Visibility/Online イベントリスナー
		this.setupVisibilityHandlers();
	}

	/**
	 * ReconcileQueueからのコールバック処理
	 */
	private async handleReconcile(key: string, pageId?: string): Promise<void> {
		try {
			// キャッシュチェック
			const cached = getCachedPageId(key);
			if (cached) {
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
						(page) => page.title.toLowerCase() === key.toLowerCase(),
					);
					resolvedPageId = exactMatch ? exactMatch.id : results[0].id;
				}
			}

			if (!resolvedPageId) {
				return;
			}

			// キャッシュに保存
			setCachedPageId(key, resolvedPageId);

			// MarkIndexを更新してマークをexists状態に
			this.markIndex.rebuild();
		} catch (error) {
			logger.error({ key, error }, "[AutoReconciler] Failed to reconcile");
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
				this.reconcileStaleKeys();
			}
		};
		document.addEventListener("visibilitychange", this.visibilityHandler);

		// Online (オンライン復帰時)
		this.onlineHandler = () => {
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

			// 各keyを個別にキューに追加（デバウンスされる）
			keys.forEach((key) => {
				this.reconcileQueue.enqueue(key);
			});
		} catch (error) {
			logger.error(
				{ error },
				"[AutoReconciler] Failed to reconcile stale keys",
			);
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

		logger.info("[AutoReconciler] Destroyed");
	}
}
