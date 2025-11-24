"use client";

import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";

/**
 * Tauri環境でのOAuth認証コールバックを処理
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ lib/auth/tauri-login.ts
 *   └─ lib/auth/__tests__/tauri-auth-handler.test.ts
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/lib/supabase/client
 *   └─ @/lib/logger
 *
 * Related Documentation:
 *   ├─ Spec: docs/guides/tauri-oauth-loopback-guide.md
 *   └─ Log: docs/05_logs/2025_11/20251123/10_tauri-auth-migration-to-loopback.md
 */

/**
 * Tauri環境での認証コールバックを処理（URLパラメータから自動取得）
 *
 * この関数は、Tauri環境でURLパラメータから認証情報を読み取り、
 * handleAuthCallbackを呼び出します。
 */
export async function handleTauriAuthCallback() {
	// Tauri環境でない場合は何もしない
	if (typeof window === "undefined" || !window.__TAURI__) {
		return;
	}

	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get("code");
	const accessToken = urlParams.get("access_token");
	const refreshToken = urlParams.get("refresh_token");
	const error = urlParams.get("error");
	const redirectTo = urlParams.get("redirect_to");

	// OAuthエラーパラメータの処理
	if (error) {
		// エラーメッセージをサニタイズ（100文字に制限）
		const sanitizedError = error.length > 100 ? error.substring(0, 100) : error;
		window.location.href = `/auth/login?error=${encodeURIComponent(sanitizedError)}`;
		return;
	}

	// リダイレクトURLの検証
	if (redirectTo) {
		// tauri://スキームのみ許可
		if (!redirectTo.startsWith("tauri://")) {
			window.location.href = "/auth/login?error=invalid_redirect";
			return;
		}
	}

	// 認証情報がない場合は何もしない
	if (!code && !accessToken) {
		return;
	}

	await handleAuthCallback({
		code,
		accessToken,
		refreshToken,
	});
}

/**
 * 認証コールバックを処理
 */
export async function handleAuthCallback({
	code,
	accessToken,
	refreshToken,
}: {
	code: string | null;
	accessToken: string | null;
	refreshToken: string | null;
}) {
	// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
	console.log("[handleAuthCallback] Called with:", {
		hasCode: !!code,
		hasAccessToken: !!accessToken,
		hasRefreshToken: !!refreshToken,
	});

	const supabase = createClient();

	// セッションを設定
	if (accessToken && refreshToken) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
		console.log("[handleAuthCallback] Setting session with tokens");
		const { error: sessionError, data: sessionData } =
			await supabase.auth.setSession({
				access_token: accessToken,
				refresh_token: refreshToken,
			});

		if (sessionError) {
			// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
			console.error("[handleAuthCallback] Session error:", sessionError);
			logger.error(
				{ error: sessionError },
				"Session error: Failed to set session",
			);
			window.location.href = "/auth/login?error=session_failed";
			return;
		}
		// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
		console.log("[handleAuthCallback] Session set successfully:", {
			hasSession: !!sessionData.session,
			hasUser: !!sessionData.user,
		});
	} else if (code) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
		console.log("[handleAuthCallback] Exchanging code for session");
		const { error: exchangeError, data: exchangeData } =
			await supabase.auth.exchangeCodeForSession(code);

		if (exchangeError) {
			// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
			console.error("[handleAuthCallback] Exchange error:", exchangeError);
			logger.error(
				{ error: exchangeError },
				"Exchange error: Failed to exchange code for session",
			);
			window.location.href = "/auth/login?error=exchange_failed";
			return;
		}
		// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
		console.log("[handleAuthCallback] Code exchanged successfully:", {
			hasSession: !!exchangeData.session,
			hasUser: !!exchangeData.user,
		});
	}

	// ユーザー情報を取得（認証が成功したことを確認）
	// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
	console.log("[handleAuthCallback] Getting user...");
	const { data: userData, error: getUserError } = await supabase.auth.getUser();

	if (getUserError) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
		console.error("[handleAuthCallback] Get user error:", getUserError);
		logger.error(
			{ error: getUserError },
			"Get user error: Failed to get user after authentication",
		);
		window.location.href = "/auth/login?error=get_user_failed";
		return;
	}

	// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
	console.log("[handleAuthCallback] User retrieved successfully:", {
		userId: userData.user?.id,
		email: userData.user?.email,
	});

	// アカウント初期化処理（createAccount, createDefaultNote等）は
	// 既存のServer Actionsを使用するため、認証コールバック後は
	// 通常のWebフローと同様にサーバー側で処理されます。
	// Tauri環境では、認証成功後にダッシュボードにリダイレクトし、
	// サーバー側の認証チェック（getCurrentUser）でアカウント初期化が
	// 必要に応じて実行されます。

	// ダッシュボードにリダイレクト
	// biome-ignore lint/suspicious/noConsole: Debug logging for auth callback
	console.log("[handleAuthCallback] Redirecting to /dashboard");

	// Tauri環境では、ページをリロードしてセッションを確実に反映させる
	// 少し遅延を入れて、セッション設定が完了するのを待つ
	setTimeout(() => {
		window.location.href = "/dashboard";
	}, 100);
}
