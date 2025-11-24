"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/utils/service-worker";

/**
 * Service Worker登録プロバイダー
 *
 * Tauri環境とWeb環境の両方に対応したService Worker登録を提供します。
 * Tauri環境ではService Workerを登録せず、Web環境（PWA）でのみ登録します。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ components/providers.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ @/lib/utils/service-worker
 *
 * Related Documentation:
 *   ├─ Issue: #157 - Phase 6: Next.js静的化とTauri統合
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

export function ServiceWorkerProvider() {
	useEffect(() => {
		// クライアント側でのみService Workerを登録
		registerServiceWorker();
	}, []);

	return null;
}
