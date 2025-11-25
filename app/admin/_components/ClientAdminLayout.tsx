"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Container } from "@/components/layouts/container";
import { useAuth } from "@/lib/hooks/use-auth";
import logger from "@/lib/logger";
import { navigationConfig } from "@/lib/navigation/config";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import pkg from "../../../package.json";

type Plan = Database["public"]["Tables"]["plans"]["Row"];

/**
 * Client Admin Layout
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/admin/layout.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/hooks/use-auth.ts
 *   ├─ lib/supabase/client.ts
 *   ├─ components/auth/AuthHeader.tsx
 *   └─ components/layouts/container.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function ClientAdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const { user, loading: authLoading } = useAuth();
	const [account, setAccount] = useState<
		Database["public"]["Tables"]["accounts"]["Row"] | null
	>(null);
	const [admin, setAdmin] = useState(false);
	const [plan, setPlan] = useState<Plan | null>(null);
	const [loading, setLoading] = useState(true);

	const version = pkg.version;

	useEffect(() => {
		if (authLoading) return;

		if (!user) {
			router.push("/auth/login");
			return;
		}

		// データ取得処理
		const fetchData = async () => {
			const supabase = createClient();

			try {
				// アカウント情報を取得
				const { data: accountData, error: accountError } = await supabase
					.from("accounts")
					.select("*")
					.eq("id", user.id)
					.single();

				if (accountError || !accountData) {
					router.push("/auth/login");
					return;
				}

				setAccount(accountData);

				// 管理者情報を取得
				const { data: adminData } = await supabase
					.from("admin_users")
					.select("role, is_active")
					.eq("user_id", user.id)
					.maybeSingle();

				const isAdmin = Boolean(
					adminData?.is_active &&
						(adminData.role === "superadmin" || adminData.role === "admin"),
				);

				if (!isAdmin) {
					// 管理者でなければトップへリダイレクト
					router.push("/");
					return;
				}

				setAdmin(isAdmin);

				// プラン情報を取得
				const { data: subscription } = await supabase
					.from("subscriptions")
					.select("plan_id")
					.eq("user_id", user.id)
					.maybeSingle();

				if (subscription?.plan_id) {
					const { data: planData } = await supabase
						.from("plans")
						.select("*")
						.eq("id", subscription.plan_id)
						.single();
					setPlan(planData || null);
				}

				setLoading(false);
			} catch (error) {
				logger.error(
					{ error, userId: user.id },
					"Error fetching admin data in ClientAdminLayout",
				);
				router.push("/auth/login");
			}
		};

		fetchData();
	}, [user, authLoading, router]);

	if (authLoading || loading || !account) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">読み込み中...</div>
			</div>
		);
	}

	return (
		<>
			{/* ヘッダーに管理者情報を渡す */}
			<AuthHeader
				version={version}
				isAdmin={admin}
				appNavItems={navigationConfig.desktop}
				playAudio={false}
				account={account}
				plan={plan}
			/>
			<Container>{children}</Container>
		</>
	);
}

