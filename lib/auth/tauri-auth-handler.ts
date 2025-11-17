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
 *   └─ app/layout.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/lib/supabase/client
 *   ├─ @/app/_actions/accounts
 *   ├─ @/app/_actions/notes
 *   ├─ @/app/_actions/promptTemplate
 *   └─ @/app/_actions/user_settings
 *
 * Related Documentation:
 *   ├─ Spec: docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export async function setupTauriAuthHandler() {
	if (!isTauri()) {
		return; // Web環境では不要
	}

	// URLパラメータから認証情報を取得（Tauri環境ではURLが直接渡される）
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get("code");
	const accessToken = urlParams.get("access_token");
	const refreshToken = urlParams.get("refresh_token");
	const error = urlParams.get("error");

	if (error) {
		// エラーページにリダイレクト
		window.location.href = `/auth/login?error=${encodeURIComponent(error)}`;
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

	// ユーザー情報を取得してアカウント初期化
	const {
		data: { user },
		error: getUserError,
	} = await supabase.auth.getUser();

	if (getUserError) {
		logger.error(
			{ error: getUserError },
			"Get user error: Failed to get user after authentication",
		);
		window.location.href = "/auth/login?error=get_user_failed";
		return;
	}

	if (user) {
		await initializeUserAccount(user);
	}

	// ダッシュボードにリダイレクト
	window.location.href = "/dashboard";
}

/**
 * ユーザーアカウントの初期化
 *
 * 注意: アカウント初期化処理（createAccount, createDefaultNote等）は
 * 既存のServer Actionsを使用するため、認証コールバック後は
 * 通常のWebフローと同様にサーバー側で処理されます。
 *
 * Tauri環境では、認証成功後にダッシュボードにリダイレクトし、
 * サーバー側の認証チェック（getCurrentUser）でアカウント初期化が
 * 必要に応じて実行されます。
 */
async function initializeUserAccount(_user: {
	id: string;
	email?: string;
	user_metadata?: any;
}) {
	// Tauri環境では、認証成功後にダッシュボードにリダイレクトするだけで
	// アカウント初期化はサーバー側で処理されます
	// （app/(protected)/layout.tsx の getCurrentUser で処理）
}
