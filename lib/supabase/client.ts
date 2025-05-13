"use client";

import type { Database } from "@/types/database.types";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) {
		throw new Error(
			"Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
		);
	}
	return createBrowserClient<Database>(url, key);
}
