import { type NextRequest, NextResponse } from "next/server";
import type { AccountWithAuth } from "@/app/admin/users/_components/UsersTable";
import logger from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
	try {
		const supabase = await createClient();

		// Fetch accounts from public.accounts
		const { data: accounts, error: acctErr } = await supabase
			.from("accounts")
			.select("id, full_name, email, gender, birthdate, avatar_url, user_slug")
			.order("id", { ascending: true });
		if (acctErr || !accounts) {
			logger.error({ acctErr }, "Failed to fetch accounts");
			return NextResponse.json(
				{ error: acctErr?.message ?? "アカウントの取得に失敗しました" },
				{ status: 500 },
			);
		}

		// Fetch auth users metadata (registration, last login) using admin client
		const supabaseAdmin = createAdminClient();
		const { data: authData, error: authErr } =
			await supabaseAdmin.auth.admin.listUsers();
		if (authErr || !authData?.users) {
			logger.error({ authErr }, "Failed to fetch auth users");
			return NextResponse.json(
				{ error: authErr?.message ?? "認証ユーザーの取得に失敗しました" },
				{ status: 500 },
			);
		}
		const authUsers = authData.users;

		// Combine account records with auth metadata
		const users: AccountWithAuth[] = accounts.map((acct) => {
			// pick only the six fields we need from the account row
			const { id, full_name, email, gender, birthdate, avatar_url, user_slug } =
				acct;
			const authUser = authUsers.find((u) => u.id === id);
			return {
				id,
				full_name,
				email,
				gender,
				birthdate,
				avatar_url,
				user_slug,
				registered_at: authUser?.created_at ?? null,
				last_sign_in_at: authUser?.last_sign_in_at ?? null,
			};
		});

		return NextResponse.json({ users });
	} catch (error) {
		logger.error({ error }, "Failed to fetch users via API");
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "不明なエラー" },
			{ status: 500 },
		);
	}
}
