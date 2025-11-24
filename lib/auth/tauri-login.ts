"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import { isTauri } from "@/lib/utils/environment";
import { handleAuthCallback } from "./tauri-auth-handler";

/**
 * Tauri環境でのGoogle OAuthログイン (Loopback Server方式)
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/auth/login/_components/LoginForm.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tauri-apps/plugin-shell
 *   ├─ @tauri-apps/api/core
 *   ├─ @tauri-apps/api/event
 *   ├─ @/lib/supabase/client
 *   ├─ @/lib/utils/environment
 *   ├─ @/lib/logger
 *   └─ ./tauri-auth-handler
 */
export async function loginWithGoogleTauri() {
	if (!isTauri()) {
		throw new Error("This function is only available in Tauri environment");
	}

	try {
		const supabase = createClient();

		logger.info("Starting Google OAuth login in Tauri environment (Loopback)");
		// biome-ignore lint/suspicious/noConsole: Debug logging
		console.log("[loginWithGoogleTauri] Starting OAuth login");

		// 1. Start Loopback Server in Rust
		const port = await invoke<number>("start_oauth_server");
		// biome-ignore lint/suspicious/noConsole: Debug logging
		console.log("[loginWithGoogleTauri] OAuth server started on port:", port);

		// 2. Setup listener for callback
		const unlisten = await listen<string>("oauth_callback", async (event) => {
			// biome-ignore lint/suspicious/noConsole: Debug logging
			console.log("[loginWithGoogleTauri] Callback received:", event.payload);

			// Stop listening immediately to avoid duplicate processing
			unlisten();

			try {
				const url = new URL(event.payload);
				const code = url.searchParams.get("code");
				const error = url.searchParams.get("error");

				if (error) {
					logger.error({ error }, "OAuth callback error received");
					throw new Error(`OAuth error: ${error}`);
				}

				if (code) {
					// biome-ignore lint/suspicious/noConsole: Debug logging
					console.log(
						"[loginWithGoogleTauri] Code received, exchanging for session",
					);
					await handleAuthCallback({
						code,
						accessToken: null,
						refreshToken: null,
					});
				} else {
					logger.warn("No code found in callback URL");
				}
			} catch (e) {
				logger.error({ error: e }, "Failed to process OAuth callback");
				// Handle UI feedback here if needed
			}
		});

		// 3. Construct Redirect URL
		// Note: You must add http://localhost:* to your Supabase Redirect URLs
		const redirectTo = `http://localhost:${port}`;
		// biome-ignore lint/suspicious/noConsole: Debug logging
		console.log("[loginWithGoogleTauri] redirectTo:", redirectTo);

		// 4. Start OAuth flow
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo,
				skipBrowserRedirect: true,
			},
		});

		if (error) {
			unlisten(); // Clean up listener on error
			logger.error({ error }, "Supabase OAuth error");
			throw new Error(`Google認証の開始に失敗しました: ${error.message}`);
		}

		if (!data.url) {
			unlisten();
			logger.error("No OAuth URL returned from Supabase");
			throw new Error("認証URLの取得に失敗しました");
		}

		logger.info({ url: data.url }, "Opening OAuth URL in external browser");

		// 5. Open in external browser
		await open(data.url);
	} catch (error) {
		if (error instanceof Error) {
			logger.error({ error }, "Google OAuth login failed");
			throw error;
		}
		logger.error({ error }, "Unexpected error in Google OAuth login");
		throw new Error(`予期しないエラーが発生しました: ${String(error)}`);
	}
}
