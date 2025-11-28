/**
 * 同期トリガー管理
 *
 * 同期を実行するタイミングを管理する
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ components/providers/sync-provider.tsx (将来)
 *
 * Dependencies:
 *   └─ lib/sync/sync-manager.ts
 *
 * Spec: lib/sync/sync.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/193
 */

import logger from "@/lib/logger";
import type { SyncManager } from "./sync-manager";

/**
 * 同期トリガー設定
 */
export interface SyncTriggerConfig {
	/** ページ表示時に同期するか */
	syncOnVisibilityChange: boolean;
	/** フォーカス時に同期するか */
	syncOnFocus: boolean;
	/** 定期同期を有効にするか */
	enablePeriodicSync: boolean;
}

/**
 * デフォルトの同期トリガー設定
 */
export const DEFAULT_SYNC_TRIGGER_CONFIG: SyncTriggerConfig = {
	syncOnVisibilityChange: true,
	syncOnFocus: false,
	enablePeriodicSync: true,
};

/**
 * 同期トリガーを設定
 *
 * @param syncManager 同期マネージャー
 * @param config 設定
 * @returns クリーンアップ関数
 */
export function setupSyncTriggers(
	syncManager: SyncManager,
	config: Partial<SyncTriggerConfig> = {},
): () => void {
	const mergedConfig = { ...DEFAULT_SYNC_TRIGGER_CONFIG, ...config };
	const cleanupFunctions: Array<() => void> = [];

	// ページ表示時の同期
	if (mergedConfig.syncOnVisibilityChange) {
		const handleVisibilityChange = () => {
			if (!document.hidden && navigator.onLine) {
				logger.debug("[SyncTriggers] Page became visible, triggering sync");
				syncManager.sync().catch((error) => {
					logger.error(
						"[SyncTriggers] Sync on visibility change failed:",
						error,
					);
				});
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		cleanupFunctions.push(() => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		});
	}

	// フォーカス時の同期
	if (mergedConfig.syncOnFocus) {
		const handleFocus = () => {
			if (navigator.onLine) {
				logger.debug("[SyncTriggers] Window focused, triggering sync");
				syncManager.sync().catch((error) => {
					logger.error("[SyncTriggers] Sync on focus failed:", error);
				});
			}
		};

		window.addEventListener("focus", handleFocus);
		cleanupFunctions.push(() => {
			window.removeEventListener("focus", handleFocus);
		});
	}

	// 定期同期の開始
	if (mergedConfig.enablePeriodicSync) {
		syncManager.start();
		cleanupFunctions.push(() => {
			syncManager.stop();
		});
	} else {
		// 定期同期が無効でも初回同期は実行
		syncManager.sync().catch((error) => {
			logger.error("[SyncTriggers] Initial sync failed:", error);
		});
	}

	// クリーンアップ関数を返す
	return () => {
		for (const cleanup of cleanupFunctions) {
			cleanup();
		}
	};
}

/**
 * Service Worker を使用したバックグラウンド同期を登録
 *
 * 注意: Service Worker のサポートが必要
 *
 * @param tag 同期タグ
 */
export async function registerBackgroundSync(
	tag = "sync-data",
): Promise<boolean> {
	if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
		logger.warn("[SyncTriggers] Background sync not supported");
		return false;
	}

	try {
		const registration = await navigator.serviceWorker.ready;
		// @ts-expect-error - SyncManager is not in the TypeScript types
		await registration.sync.register(tag);
		logger.info({ tag }, "[SyncTriggers] Background sync registered");
		return true;
	} catch (error) {
		logger.error(
			{ error },
			"[SyncTriggers] Failed to register background sync",
		);
		return false;
	}
}

/**
 * Periodic Background Sync を登録
 *
 * 注意: 一部のブラウザでのみサポート
 *
 * @param tag 同期タグ
 * @param minInterval 最小間隔（ミリ秒）
 */
export async function registerPeriodicBackgroundSync(
	tag = "periodic-sync",
	minInterval = 12 * 60 * 60 * 1000, // 12時間
): Promise<boolean> {
	if (
		!("serviceWorker" in navigator) ||
		!("periodicSync" in ServiceWorkerRegistration.prototype)
	) {
		logger.warn("[SyncTriggers] Periodic background sync not supported");
		return false;
	}

	try {
		const registration = await navigator.serviceWorker.ready;
		const status = await navigator.permissions.query({
			// @ts-expect-error - periodic-background-sync is not in the TypeScript types
			name: "periodic-background-sync",
		});

		if (status.state !== "granted") {
			logger.warn(
				"[SyncTriggers] Periodic background sync permission not granted",
			);
			return false;
		}

		// @ts-expect-error - periodicSync is not in the TypeScript types
		await registration.periodicSync.register(tag, { minInterval });
		logger.info(
			{ tag, minInterval },
			"[SyncTriggers] Periodic background sync registered",
		);
		return true;
	} catch (error) {
		logger.error(
			{ error },
			"[SyncTriggers] Failed to register periodic background sync",
		);
		return false;
	}
}

/**
 * ページアンロード前に同期を試みる
 *
 * 注意: 時間制限があるため、大量のデータがある場合は完了しない可能性がある
 *
 * @param syncManager 同期マネージャー
 * @returns クリーンアップ関数
 */
export function setupBeforeUnloadSync(syncManager: SyncManager): () => void {
	const handleBeforeUnload = () => {
		// sendBeacon を使用して同期リクエストを送信
		// 注意: これは同期完了を保証しない
		if (navigator.onLine && !syncManager.getIsSyncing()) {
			// 同期待ちデータがある場合のみ
			const state = syncManager.getState();
			if (state.pendingCount > 0) {
				logger.debug(
					{ pendingCount: state.pendingCount },
					"[SyncTriggers] Page unloading with pending data",
				);
				// ここでは警告のみ。実際の同期は Service Worker で行う
			}
		}
	};

	window.addEventListener("beforeunload", handleBeforeUnload);

	return () => {
		window.removeEventListener("beforeunload", handleBeforeUnload);
	};
}
