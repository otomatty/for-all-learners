/**
 * Profile Account API Route
 *
 * API for updating user account information
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ app/(protected)/profile/_components/profile-form.tsx
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ types/database.types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

/**
 * PATCH /api/profile/account - Update user account
 */
export async function PATCH(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "認証が必要です" },
				{ status: 401 },
			);
		}

		const body = (await request.json()) as {
			accountId: string;
			updates: Partial<Account>;
		};

		if (!body.accountId || !body.updates) {
			return NextResponse.json(
				{ error: "Bad request", message: "accountIdとupdatesは必須です" },
				{ status: 400 },
			);
		}

		// Verify user owns this account
		const { data: account, error: accountError } = await supabase
			.from("accounts")
			.select("id")
			.eq("id", body.accountId)
			.eq("user_id", user.id)
			.single();

		if (accountError || !account) {
			return NextResponse.json(
				{
					error: "Forbidden",
					message: "このアカウントを更新する権限がありません",
				},
				{ status: 403 },
			);
		}

		// Update account
		const { data, error } = await supabase
			.from("accounts")
			.update(body.updates)
			.eq("id", body.accountId)
			.select()
			.single();

		if (error) {
			logger.error({ error }, "Failed to update account");
			return NextResponse.json(
				{
					error: "Database error",
					message: `アカウントの更新に失敗しました: ${error.message}`,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(data);
	} catch (error: unknown) {
		logger.error({ error }, "Failed to update account");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "アカウントの更新中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
