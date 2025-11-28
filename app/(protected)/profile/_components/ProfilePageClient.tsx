"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { useAuth } from "@/lib/hooks/use-auth";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import ProfileForm from "./profile-form";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

/**
 * Profile Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/profile/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/hooks/use-auth.ts
 *   ├─ lib/supabase/client.ts
 *   └─ components/layouts/container.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function ProfilePageClient() {
	const router = useRouter();
	const { user, loading: authLoading } = useAuth();
	const [account, setAccount] = useState<Account | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (authLoading) return;

		if (!user) {
			router.push("/auth/login");
			return;
		}

		const fetchAccount = async () => {
			const supabase = createClient();

			try {
				// アカウント情報を取得
				let { data: accountData, error: accountError } = await supabase
					.from("accounts")
					.select("*")
					.eq("id", user.id)
					.single();

				// アカウントが存在しない場合は作成
				if (!accountData) {
					const { data: newAccount, error: createError } = await supabase
						.from("accounts")
						.insert({
							id: user.id,
							email: user.email ?? undefined,
							user_slug: user.id,
						})
						.select("*")
						.single();

					if (createError) {
						throw new Error(
							createError.message ?? "アカウントの作成に失敗しました",
						);
					}

					accountData = newAccount;
				} else if (accountError) {
					throw new Error(
						accountError.message ?? "アカウントの取得に失敗しました",
					);
				}

				setAccount(accountData);
				setLoading(false);
			} catch (error) {
				logger.error({ error }, "Error fetching account in ProfilePageClient");
				router.push("/auth/login");
			}
		};

		fetchAccount();
	}, [user, authLoading, router]);

	if (authLoading || loading) {
		return (
			<>
				<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
					<BackLink path="/dashboard" title="ホームに戻る" />
				</div>
				<Container className="max-w-3xl">
					<div className="flex items-center justify-center min-h-screen">
						<div className="text-muted-foreground">読み込み中...</div>
					</div>
				</Container>
			</>
		);
	}

	if (!account) {
		return null; // ClientProtectedLayoutでリダイレクトされる
	}

	return (
		<>
			<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
				<BackLink path="/dashboard" title="ホームに戻る" />
			</div>
			<Container className="max-w-3xl">
				<h1 className="text-2xl font-bold mb-6">プロフィール</h1>
				<ProfileForm initialAccount={account} />
			</Container>
		</>
	);
}
