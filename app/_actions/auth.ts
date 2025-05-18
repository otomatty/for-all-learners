"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Initiate Google OAuth login via Supabase
 */
export async function loginWithGoogle() {
	const supabase = await createClient();
	const {
		data: { url },
		error,
	} = await supabase.auth.signInWithOAuth({
		provider: "google",
		options: {
			// Redirect back to our callback route after login
			redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
		},
	});
	if (error) {
		console.error("Google login error:", error);
		throw new Error("Google login failed");
	}
	if (url) {
		// Perform redirect to Supabase OAuth URL
		redirect(url);
	}
}

/**
 * Sign out the current user
 */
export async function logout() {
	const supabase = await createClient();
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error("Sign out error:", error);
		throw new Error("Logout failed");
	}
	// Redirect to login page after sign out
	redirect("/auth/login");
}

/**
 * Initiate Magic Link login via Supabase
 * @param email The user's email address
 */
export async function loginWithMagicLink(formData: FormData) {
	const email = formData.get("email") as string;
	if (!email) {
		// TODO: より良いエラーハンドリングとユーザーへのフィードバック
		throw new Error("Email is required for Magic Link login.");
	}

	const supabase = await createClient();
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			// Redirect back to our callback route after login from email
			emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
		},
	});
	if (error) {
		console.error("Magic Link login error:", error);
		throw new Error(`Magic Link login failed: ${error.message}`);
	}
	// Magic Linkが送信されたことをユーザーに通知するために、リダイレクトやメッセージ表示を検討できます。
	// ここでは、ログインページにメッセージを表示するためのクエリパラメータを付与してリダイレクトします。
	redirect("/auth/login?message=magic_link_sent");
}

/**
 * Fetch current authenticated user's account information.
 */
export async function getCurrentUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return null;
	const { data: account, error: accError } = await supabase
		.from("accounts")
		.select("*")
		.eq("id", user.id)
		.single();
	if (accError) throw accError;
	return account;
}
