"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Tauri環境でのGoogle OAuthログイン
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/auth/login/_components/LoginForm.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/lib/supabase/client
 *   └─ @tauri-apps/api/shell
 *
 * Related Documentation:
 *   ├─ Spec: docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export async function loginWithGoogleTauri() {
	const supabase = createClient();
	const isTauri =
		typeof window !== "undefined" &&
		"__TAURI__" in window &&
		window.__TAURI__ !== undefined;

	if (!isTauri) {
		throw new Error("This function is only available in Tauri environment");
	}

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: "google",
		options: {
			redirectTo: "tauri://localhost/auth/callback",
			// Tauri環境では外部ブラウザで開く
			skipBrowserRedirect: true,
		},
	});

	if (error) {
		throw new Error(`Google login failed: ${error.message}`);
	}

	if (data.url) {
		// 外部ブラウザでOAuth URLを開く
		// Tauri環境では、window.openで外部ブラウザを開く
		// (shell pluginは後で追加可能)
		window.open(data.url, "_blank");
	}
}
