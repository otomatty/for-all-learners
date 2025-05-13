import { AppFooter } from "@/components/app-footer";
import { UnauthHeader } from "@/components/unauth-header";
// Supabase のサーバーサイドクライアントを作成する関数をインポートします。
// パスはプロジェクトの構成に合わせて調整してください。
import { createClient } from "@/lib/supabase/server"; // 例: utils/supabase/server.ts
import type React from "react";
import { version } from "../../package.json";

export default async function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Supabase クライアントのインスタンスを作成します。
	// createClient 関数の実装によっては cookieStore が不要な場合もあります。
	// プロジェクトの Supabase 設定に合わせてください。
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<div className="min-h-screen flex flex-col">
			<UnauthHeader version={version} isAuthenticated={!!user} />
			<main>{children}</main>
			<AppFooter version={version} appName="For All Learners" />
		</div>
	);
}
