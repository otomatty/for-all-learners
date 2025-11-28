import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/gyazo/callback - Gyazo OAuth callback handler
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ Gyazo OAuth redirect (external)
 *
 * Dependencies (External files that this route uses):
 *   ├─ @/lib/supabase/server (createClient)
 *   └─ @/lib/logger (logger)
 *
 * Related Documentation:
 *   ├─ Database Schema: database/user_gyazo_token.sql
 *   └─ Settings Component: app/(protected)/settings/_components/external-sync-settings/gyazo-sync-settings.tsx
 */
export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const code = searchParams.get("code");
	const error = searchParams.get("error");

	if (error) {
		logger.error({ error }, "Gyazo OAuth error");
		return NextResponse.redirect(
			new URL(
				`/settings?error=gyazo&error_description=${encodeURIComponent(error)}`,
				req.url,
			),
		);
	}

	if (!code) {
		return NextResponse.json(
			{ error: "Missing code parameter" },
			{ status: 400 },
		);
	}

	try {
		const supabase = await createClient();

		// Get authenticated user
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return NextResponse.redirect(
				new URL("/auth/login?error=gyazo_auth_required", req.url),
			);
		}

		// Exchange authorization code for access token
		const GYAZO_CLIENT_ID = process.env.GYAZO_CLIENT_ID;
		const GYAZO_CLIENT_SECRET = process.env.GYAZO_CLIENT_SECRET;
		const GYAZO_REDIRECT_URI = process.env.GYAZO_REDIRECT_URI;

		if (!GYAZO_CLIENT_ID || !GYAZO_CLIENT_SECRET || !GYAZO_REDIRECT_URI) {
			logger.error("Gyazo OAuth credentials not configured");
			return NextResponse.redirect(
				new URL("/settings?error=gyazo_config", req.url),
			);
		}

		// Exchange code for access token
		const tokenResponse = await fetch("https://api.gyazo.com/oauth/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: GYAZO_CLIENT_ID,
				client_secret: GYAZO_CLIENT_SECRET,
				code,
				redirect_uri: GYAZO_REDIRECT_URI,
				grant_type: "authorization_code",
			}),
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			logger.error(
				{ status: tokenResponse.status, error: errorText },
				"Failed to exchange Gyazo OAuth code",
			);
			return NextResponse.redirect(
				new URL("/settings?error=gyazo_token_exchange", req.url),
			);
		}

		const tokenData = (await tokenResponse.json()) as {
			access_token: string;
			refresh_token?: string;
			expires_in?: number;
		};

		// Calculate expiration time
		const expiresAt = tokenData.expires_in
			? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
			: null;

		// Save or update token in database
		const { error: upsertError } = await supabase
			.from("user_gyazo_tokens")
			.upsert(
				{
					user_id: user.id,
					access_token: tokenData.access_token,
					refresh_token: tokenData.refresh_token || null,
					expires_at: expiresAt,
					updated_at: new Date().toISOString(),
				},
				{
					onConflict: "user_id",
				},
			);

		if (upsertError) {
			logger.error({ error: upsertError }, "Failed to save Gyazo token");
			return NextResponse.redirect(
				new URL("/settings?error=gyazo_save_token", req.url),
			);
		}

		logger.info({ userId: user.id }, "Gyazo OAuth token saved successfully");

		// Redirect to settings page
		return NextResponse.redirect(new URL("/settings", req.url));
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			"Gyazo OAuth callback error",
		);
		// エラー時も設定ページにリダイレクト（クエリで状態を示せる）
		return NextResponse.redirect(new URL("/settings?error=gyazo", req.url));
	}
}
