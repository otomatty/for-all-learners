import { redirect } from "next/navigation";
import type React from "react";
import { isAdmin } from "@/app/_actions/admin";
import { getCurrentUser } from "@/app/_actions/auth";
import { getUserPlan } from "@/app/_actions/subscriptions";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Container } from "@/components/layouts/container";
import pkg from "../../package.json";

interface AdminLayoutProps {
	children: React.ReactNode;
}

const version = pkg.version;

export default async function AdminLayout({ children }: AdminLayoutProps) {
	// 管理者権限チェック
	const admin = await isAdmin();
	if (!admin) {
		// 管理者でなければトップへリダイレクト
		redirect("/");
	}

	// ユーザー情報とプランを取得
	const account = await getCurrentUser();
	if (!account) redirect("/auth/login");
	const plan = await getUserPlan(account.id);

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
