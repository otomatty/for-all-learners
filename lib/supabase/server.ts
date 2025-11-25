import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

export async function createClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key)
		throw new Error(
			"Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
		);

	// 静的エクスポート時はcookies()を使用できないため、空のクッキーストアを使用
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return createServerClient<Database>(url, key, {
			cookies: {
				getAll() {
					return [];
				},
				setAll() {
					// 静的エクスポート時はクッキーを設定できない
				},
			},
		});
	}

	const cookieStore = await cookies();

	return createServerClient<Database>(url, key, {
		cookies: {
			getAll() {
				return cookieStore
					.getAll()
					.map((c) => ({ name: c.name, value: c.value }));
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					cookieStore.set({ name, value, ...options });
				}
			},
		},
	});
}
