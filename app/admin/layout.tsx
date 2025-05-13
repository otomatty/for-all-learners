import { isAdmin } from "@/app/_actions/admin";
import { AuthHeader } from "@/components/auth-header";
import { Container } from "@/components/container";
import { redirect } from "next/navigation";
import type React from "react";
import { version } from "../../package.json";

interface AdminLayoutProps {
	children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
	// 管理者権限チェック
	const admin = await isAdmin();
	if (!admin) {
		// 管理者でなければトップへリダイレクト
		redirect("/");
	}

	return (
		<>
			{/* ヘッダーに管理者情報を渡す */}
			<AuthHeader
				version={version}
				isAdmin={admin}
				appNavItems={[]}
				playAudio={false}
			/>
			<Container>{children}</Container>
		</>
	);
}
