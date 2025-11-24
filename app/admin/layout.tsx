import { redirect } from "next/navigation";
import type React from "react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Container } from "@/components/layouts/container";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import pkg from "../../package.json";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type Plan = Database["public"]["Tables"]["plans"]["Row"];

interface AdminLayoutProps {
	children: React.ReactNode;
}

const version = pkg.version;

export default async function AdminLayout({ children }: AdminLayoutProps) {
	const supabase = await createClient();

	// 認証チェック
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect("/auth/login");
	}

	// 管理者権限チェック
	const { data: adminData } = await supabase
		.from("admin_users")
		.select("role, is_active")
		.eq("user_id", user.id)
		.maybeSingle();

	const admin =
		adminData?.is_active &&
		(adminData.role === "superadmin" || adminData.role === "admin");

	if (!admin) {
		// 管理者でなければトップへリダイレクト
		redirect("/");
	}

	// アカウント情報を取得
	const { data: account } = await supabase
		.from("accounts")
		.select("*")
		.eq("id", user.id)
		.single();

	if (!account) {
		redirect("/auth/login");
	}

	// プラン情報を取得
	let plan: Plan | null = null;
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
		plan = planData || null;
	}

	return (
		<>
			{/* ヘッダーに管理者情報を渡す */}
			<AuthHeader
				version={version}
				isAdmin={admin}
				appNavItems={[]}
				playAudio={false}
				account={account}
				plan={plan}
			/>
			<Container>{children}</Container>
		</>
	);
}
