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
