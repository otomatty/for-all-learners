/**
 * 環境判定ユーティリティ
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ lib/auth/tauri-login.ts
 *   ├─ lib/auth/tauri-auth-handler.ts
 *   ├─ lib/supabase/tauri-client.ts
 *   └─ app/auth/login/_components/LoginForm.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ (none - pure utility)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

/**
 * Tauri環境かどうかを判定
 *
 * @returns Tauri環境の場合 true、それ以外 false
 */
export function isTauri(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	return "__TAURI__" in window && window.__TAURI__ !== undefined;
}

