"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isTauri } from "@/lib/utils/environment";
import type { Database } from "@/types/database.types";

/**
 * Tauri環境とWeb環境の両方に対応したSupabaseクライアント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ lib/supabase/client.ts
 *
 * Dependencies (External files that this file imports):
 *   ├─ @supabase/ssr
 *   └─ @/types/database.types
 *
 * Related Documentation:
 *   ├─ Spec: docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function createClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !key) {
		throw new Error(
			"Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
		);
	}

	// Tauri環境では、カスタムストレージアダプターを使用
	return createBrowserClient<Database>(url, key, {
		auth: {
			// Tauri環境では localStorage を明示的に使用
			storage: isTauri()
				? {
						getItem: (key: string) => {
							return localStorage.getItem(key);
						},
						setItem: (key: string, value: string) => {
							localStorage.setItem(key, value);
						},
						removeItem: (key: string) => {
							localStorage.removeItem(key);
						},
					}
				: undefined, // Web環境ではデフォルトのストレージを使用

			// セッションの永続化設定
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: !isTauri(), // Tauri環境ではURL検出を無効化
		},
	});
}
