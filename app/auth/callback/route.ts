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
			`${requestUrl.origin}/auth/login?error=${errorParam}`,
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
				`${requestUrl.origin}/auth/login?error=exchange_failed`,
			);
		}
	}

	// After successful auth, seed or upsert user in accounts table
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (user) {
		const { error: upsertError } = await supabase
			.from("accounts")
			.upsert({
				id: user.id,
				email: user.email,
				full_name: user.user_metadata?.full_name ?? null,
				avatar_url: user.user_metadata?.avatar_url ?? null,
			})
			.single();
		if (upsertError) {
			console.error("Error upserting account:", upsertError);
		}
	} else if (userError) {
		console.error("Error retrieving user:", userError);
	}

	// After seeding account, redirect to dashboard
	return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
