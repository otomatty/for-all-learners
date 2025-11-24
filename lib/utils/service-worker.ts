/**
 * Service Worker制御ユーティリティ
 *
 * Tauri環境とWeb環境の両方に対応したService Worker登録制御を提供します。
 * Tauri環境ではService Workerを登録せず、Web環境（PWA）でのみ登録します。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/layout.tsx (将来)
 *
 * Dependencies (External files that this file imports):
 *   └─ @/lib/utils/environment
 *
 * Related Documentation:
 *   ├─ Issue: #157 - Phase 6: Next.js静的化とTauri統合
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { isTauri } from "./environment";

/**
 * Service Workerを登録すべきかどうかを判定
 *
 * @returns Tauri環境でない場合（Web環境）は true、Tauri環境の場合は false
 */
export function shouldRegisterServiceWorker(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	return !isTauri();
}

/**
 * Service Workerを登録する
 *
 * Tauri環境では登録せず、Web環境（PWA）でのみ登録します。
 * Service Worker APIが利用できない場合は何もしません。
 *
 * @param swPath Service Workerファイルのパス（デフォルト: "/sw.js"）
 * @param scope Service Workerのスコープ（デフォルト: "/"）
 */
export async function registerServiceWorker(
	swPath = "/sw.js",
	scope = "/",
): Promise<void> {
	// Tauri環境ではService Workerを登録しない
	if (!shouldRegisterServiceWorker()) {
		return;
	}

	// Service Worker APIが利用できない場合は何もしない
	if (
		typeof navigator === "undefined" ||
		!("serviceWorker" in navigator) ||
		!navigator.serviceWorker
	) {
		return;
	}

	try {
		await navigator.serviceWorker.register(swPath, { scope });
	} catch (error) {
		// Service Worker登録エラーは無視（PWAが必須ではないため）
		// biome-ignore lint/suspicious/noConsole: Service Worker登録エラーのログ出力
		console.warn("Service Worker registration failed:", error);
	}
}
