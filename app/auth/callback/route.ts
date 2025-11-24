import { NextResponse } from "next/server";
import { createAccount, getAccountById } from "@/app/_actions/accounts";
import { createDefaultNote } from "@/app/_actions/notes";
import { initializeUserPromptTemplates } from "@/app/_actions/promptTemplate";
import { getUserSettings } from "@/app/_actions/user_settings";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	// 最初に必ずログを出力（リクエストが到達しているか確認）
	// biome-ignore lint/suspicious/noConsole: Debug logging
	console.log("========================================");
	// biome-ignore lint/suspicious/noConsole: Debug logging
	console.log(
		"[auth/callback/route] GET request received at:",
		new Date().toISOString(),
	);
	// biome-ignore lint/suspicious/noConsole: Debug logging
	console.log("[auth/callback/route] Request URL:", request.url);
	// biome-ignore lint/suspicious/noConsole: Debug logging
	console.log("========================================");

	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const errorParam = requestUrl.searchParams.get("error");
	const isTauriCallback = requestUrl.searchParams.get("tauri") === "true";

	// Debug logging
	// biome-ignore lint/suspicious/noConsole: Debug logging
	console.log("[auth/callback/route] Parsed URL:", requestUrl.toString());
	// biome-ignore lint/suspicious/noConsole: Debug logging
	console.log("[auth/callback/route] Params:", {
		code: code ? `${code.substring(0, 20)}...` : null,
		errorParam,
		isTauriCallback,
		sessionId: requestUrl.searchParams.get("sessionId"),
	});

	// Handle OAuth errors
	if (errorParam) {
		return NextResponse.redirect(
			`${requestUrl.origin}/auth/login?error=${encodeURIComponent(errorParam)}&error_description=${encodeURIComponent(requestUrl.searchParams.get("error_description") || "Unknown OAuth error")}`,
		);
	}

	const accessToken = requestUrl.searchParams.get("access_token");
	const refreshToken = requestUrl.searchParams.get("refresh_token");

	const supabase = await createClient();

	if (accessToken && refreshToken) {
		// Direct session set when tokens provided
		await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: refreshToken,
		});
	} else if (code) {
		// Exchange authorization code for session
		const { error: exchangeError } =
			await supabase.auth.exchangeCodeForSession(code);
		if (exchangeError) {
			return NextResponse.redirect(
				`${requestUrl.origin}/auth/login?error=auth_exchange_failed&error_description=${encodeURIComponent(exchangeError.message)}`,
			);
		}
	}

	// After successful auth, register account and initialize settings using server actions
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.redirect(
			`${requestUrl.origin}/auth/login?error=user_retrieval_failed${userError ? `&error_description=${encodeURIComponent(userError.message)}` : ""}`,
		);
	}
	// Account existence check and creation
	const account = await getAccountById(user.id);
	if (!account) {
		if (!user.email) {
			return NextResponse.redirect(
				`${requestUrl.origin}/auth/login?error=no_email_for_account`,
			);
		}
		// Generate slug from email (before '@')
		const emailSlug = user.email.split("@")[0];
		await createAccount({
			id: user.id,
			email: user.email,
			full_name: user.user_metadata?.full_name ?? null,
			avatar_url: user.user_metadata?.avatar_url ?? null,
			user_slug: emailSlug,
		});
		// Create default note for new user
		await createDefaultNote(user.id);
	}
	// Ensure user settings are initialized
	await getUserSettings();
	// Initialize default user prompt templates
	await initializeUserPromptTemplates();

	// After successful auth, redirect to dashboard
	return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
