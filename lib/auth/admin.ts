/**
 * Admin Authentication Utilities
 *
 * Server-side utilities for checking admin access
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import these functions):
 *   ├─ app/api/version-commit-staging/route.ts
 *   └─ app/api/version-commit-staging/[id]/route.ts
 *
 * Dependencies (External files that this file uses):
 *   └─ lib/supabase/server.ts (createClient)
 */

import { createClient } from "@/lib/supabase/server";

/**
 * 現在のユーザーが admin_users テーブルで有効な管理者かを判定する
 * @returns 管理者なら true、そうでなければ false
 */
export async function isAdmin(): Promise<boolean> {
	const supabase = await createClient();
	// 認証中のユーザー情報を取得
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return false;
	}

	// admin_users テーブルを照会
	const { data, error } = await supabase
		.from("admin_users")
		.select("role, is_active")
		.eq("user_id", user.id)
		.maybeSingle();

	if (error) {
		return false;
	}

	// 一般ユーザー（データなし）または非アクティブ管理者は false
	if (!data || !data.is_active) {
		return false;
	}

	// role が superadmin または admin なら true
	return data.role === "superadmin" || data.role === "admin";
}
