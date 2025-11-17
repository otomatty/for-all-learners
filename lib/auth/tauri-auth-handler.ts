"use client";

import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import { isTauri } from "@/lib/utils/environment";

/**
 * Tauri環境でのOAuth認証コールバックを処理
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ components/auth/TauriAuthHandler.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/lib/supabase/client
 *   ├─ @/lib/utils/environment
 *   └─ @/lib/logger
 *
 * Related Documentation:
 *   ├─ Spec: docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export async function handleTauriAuthCallback() {
	if (!isTauri()) {
		return; // Web環境では不要
	}

	// URLパラメータから認証情報を取得（Tauri環境ではURLが直接渡される）
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get("code");
	const accessToken = urlParams.get("access_token");
	const refreshToken = urlParams.get("refresh_token");
	const error = urlParams.get("error");

	// リダイレクトURLの検証（セキュリティ）
	// Tauri環境では、tauri://スキームのみ許可
	const redirectUrl = urlParams.get("redirect_to");
	if (redirectUrl && !redirectUrl.startsWith("tauri://")) {
		logger.error(
			{ redirectUrl },
			"Invalid redirect URL: Only tauri:// scheme is allowed",
		);
		window.location.href = "/auth/login?error=invalid_redirect";
		return;
	}

	if (error) {
		// エラーパラメータの検証（セキュリティ）
		const sanitizedError = encodeURIComponent(
			error.length > 100 ? error.substring(0, 100) : error,
		);
		// エラーページにリダイレクト
		window.location.href = `/auth/login?error=${sanitizedError}`;
		return;
	}

	if (code || (accessToken && refreshToken)) {
		await handleAuthCallback({ code, accessToken, refreshToken });
	}
}

/**
 * 認証コールバックを処理
 */
async function handleAuthCallback({
	code,
	accessToken,
	refreshToken,
}: {
	code: string | null;
	accessToken: string | null;
	refreshToken: string | null;
}) {
	const supabase = createClient();

	// セッションを設定
	if (accessToken && refreshToken) {
		const { error: sessionError } = await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: refreshToken,
		});

		if (sessionError) {
			logger.error(
				{ error: sessionError },
				"Session error: Failed to set session",
			);
			window.location.href = "/auth/login?error=session_failed";
			return;
		}
	} else if (code) {
		const { error: exchangeError } =
			await supabase.auth.exchangeCodeForSession(code);

		if (exchangeError) {
			logger.error(
				{ error: exchangeError },
				"Exchange error: Failed to exchange code for session",
			);
			window.location.href = "/auth/login?error=exchange_failed";
			return;
		}
	}

	// ユーザー情報を取得（認証が成功したことを確認）
	const { error: getUserError } = await supabase.auth.getUser();

	if (getUserError) {
		logger.error(
			{ error: getUserError },
			"Get user error: Failed to get user after authentication",
		);
		window.location.href = "/auth/login?error=get_user_failed";
		return;
	}

	// アカウント初期化処理（createAccount, createDefaultNote等）は
	// 既存のServer Actionsを使用するため、認証コールバック後は
	// 通常のWebフローと同様にサーバー側で処理されます。
	// Tauri環境では、認証成功後にダッシュボードにリダイレクトし、
	// サーバー側の認証チェック（getCurrentUser）でアカウント初期化が
	// 必要に応じて実行されます。

	// ダッシュボードにリダイレクト
	window.location.href = "/dashboard";
}
