"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Tauri環境でのMagic Link認証
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/auth/login/_components/LoginForm.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ @/lib/supabase/client
 *
 * Related Documentation:
 *   ├─ Spec: docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export async function loginWithMagicLinkTauri(email: string) {
	const supabase = createClient();

	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			emailRedirectTo: "tauri://localhost/auth/callback",
		},
	});

	if (error) {
		throw new Error(`Magic Link login failed: ${error.message}`);
	}

	// メール送信成功の通知
	return { success: true, message: "認証メールを送信しました" };
}
