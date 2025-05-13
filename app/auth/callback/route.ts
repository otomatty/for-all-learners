import { createAccount, getAccountById } from "@/app/_actions/accounts";
import { getUserSettings } from "@/app/_actions/user_settings";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const errorParam = requestUrl.searchParams.get("error");

	// Handle OAuth errors
	if (errorParam) {
		console.error(
			"OAuth error:",
			errorParam,
			requestUrl.searchParams.get("error_description"),
		);
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
		const { data, error: exchangeError } =
			await supabase.auth.exchangeCodeForSession(code);
		if (exchangeError) {
			console.error("Error exchanging code for session:", exchangeError);
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
		console.error("Error retrieving user:", userError);
		return NextResponse.redirect(
			`${requestUrl.origin}/auth/login?error=user_retrieval_failed${userError ? `&error_description=${encodeURIComponent(userError.message)}` : ""}`,
		);
	}
	// Account existence check and creation
	const account = await getAccountById(user.id);
	if (!account) {
		if (!user.email) {
			console.error("ユーザーにメールアドレスがありません");
			return NextResponse.redirect(
				`${requestUrl.origin}/auth/login?error=no_email_for_account`,
			);
		}
		await createAccount({
			id: user.id,
			email: user.email,
			full_name: user.user_metadata?.full_name ?? null,
			avatar_url: user.user_metadata?.avatar_url ?? null,
		});
	}
	// Ensure user settings are initialized
	await getUserSettings();

	// After successful auth, redirect to dashboard
	return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
