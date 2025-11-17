"use client";

import { useEffect } from "react";
import { handleTauriAuthCallback } from "@/lib/auth/tauri-auth-handler";
import { isTauri } from "@/lib/utils/environment";

/**
 * Tauri環境での認証ハンドラーを初期化するコンポーネント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ components/providers.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ @/lib/auth/tauri-auth-handler
 *
 * Related Documentation:
 *   ├─ Spec: docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function TauriAuthHandler() {
	useEffect(() => {
		// Tauri環境でのみDeep Linkハンドラーを設定
		if (isTauri()) {
			handleTauriAuthCallback();
		}
	}, []);

	return null;
}
