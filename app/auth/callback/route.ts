import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const errorParam = requestUrl.searchParams.get("error");

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
	const { data: account } = await supabase
		.from("accounts")
		.select("id")
		.eq("id", user.id)
		.maybeSingle();

	if (!account) {
		if (!user.email) {
			return NextResponse.redirect(
				`${requestUrl.origin}/auth/login?error=no_email_for_account`,
			);
		}
		// Generate slug from email (before '@')
		const emailSlug = user.email.split("@")[0];
		const { error: createAccountError } = await supabase
			.from("accounts")
			.insert({
				id: user.id,
				email: user.email,
				full_name: user.user_metadata?.full_name ?? null,
				avatar_url: user.user_metadata?.avatar_url ?? null,
				user_slug: emailSlug,
			});

		if (createAccountError) {
			return NextResponse.redirect(
				`${requestUrl.origin}/auth/login?error=account_creation_failed&error_description=${encodeURIComponent(createAccountError.message)}`,
			);
		}

		// Create default note for new user
		const defaultSlug = "all-pages";
		const { error: createNoteError } = await supabase.from("notes").insert({
			owner_id: user.id,
			slug: defaultSlug,
			title: "すべてのページ",
			description: "ユーザーが作成したすべてのページを含むデフォルトノート",
			visibility: "private",
			is_default_note: true,
		});

		if (createNoteError) {
			// Log error but don't fail auth - note can be created later
			logger.error(
				{ error: createNoteError, userId: user.id },
				"Failed to create default note",
			);
		}
	}

	// Ensure user settings are initialized
	const { data: userSettings } = await supabase
		.from("user_settings")
		.select("id")
		.eq("user_id", user.id)
		.maybeSingle();

	if (!userSettings) {
		const { error: initSettingsError } = await supabase
			.from("user_settings")
			.insert({ user_id: user.id });

		if (initSettingsError) {
			// Log error but don't fail auth - settings can be initialized later
			logger.error(
				{ error: initSettingsError, userId: user.id },
				"Failed to initialize user settings",
			);
		}
	}

	// Initialize default user prompt templates (if needed)
	// Note: This functionality may not be implemented yet
	// If prompt templates table exists, initialize default templates here

	// After successful auth, redirect to dashboard
	return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
