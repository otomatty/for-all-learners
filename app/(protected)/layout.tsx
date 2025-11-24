import { redirect } from "next/navigation";
import type React from "react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AppFooter } from "@/components/layouts/AppFooter";
import { navigationConfig } from "@/lib/navigation/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import pkg from "../../package.json";

type Plan = Database["public"]["Tables"]["plans"]["Row"];

interface ProtectedLayoutProps {
	children: React.ReactNode;
}

const version = pkg.version;

export default async function ProtectedLayout({
	children,
}: ProtectedLayoutProps) {
	const supabase = await createClient();

	// 認証チェック
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect("/auth/login");
	}

	// 管理者チェック
	const { data: adminData } = await supabase
		.from("admin_users")
		.select("role, is_active")
		.eq("user_id", user.id)
		.maybeSingle();

	const admin = Boolean(
		adminData?.is_active &&
			(adminData.role === "superadmin" || adminData.role === "admin"),
	);

	// アカウント情報を取得
	const { data: account } = await supabase
		.from("accounts")
		.select("*")
		.eq("id", user.id)
		.single();

	if (!account) {
		redirect("/auth/login");
	}

	// ユーザー設定からplayAudioを取得
	const { data: userSettings } = await supabase
		.from("user_settings")
		.select("play_help_video_audio")
		.eq("user_id", user.id)
		.maybeSingle();

	const playAudio = userSettings?.play_help_video_audio ?? false;

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

	// アプリ名を指定します。必要に応じて変更してください。
	const appName = "For All Learners";

	return (
		<div className="flex flex-col min-h-screen">
			<AuthHeader
				version={version}
				isAdmin={admin}
				appNavItems={navigationConfig.desktop}
				playAudio={playAudio}
				account={account}
				plan={plan}
			/>
			<main className="bg-secondary min-h-screen">{children}</main>
			<AppFooter version={version} appName={appName} />
		</div>
	);
}
