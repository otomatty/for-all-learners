import type React from "react";
import { UnauthHeader } from "@/components/auth/UnauthHeader";
import { AppFooter } from "@/components/layouts/AppFooter";
// Supabase のサーバーサイドクライアントを作成する関数をインポートします。
// パスはプロジェクトの構成に合わせて調整してください。
import { createClient } from "@/lib/supabase/server"; // 例: utils/supabase/server.ts
import pkg from "../../package.json";

const version = pkg.version;

export default async function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// 静的エクスポート時はcookies()を使用できないため、認証情報を取得しない
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	let user = null;

	if (!isStaticExport) {
		try {
			// Supabase クライアントのインスタンスを作成します。
			// createClient 関数の実装によっては cookieStore が不要な場合もあります。
			// プロジェクトの Supabase 設定に合わせてください。
			const supabase = await createClient();
			const {
				data: { user: authUser },
			} = await supabase.auth.getUser();
			user = authUser;
		} catch (_error) {
			// エラー時は認証されていないとみなす
		}
	}

	return (
		<div className="min-h-screen flex flex-col">
			<UnauthHeader version={version} isAuthenticated={!!user} />
			<main>{children}</main>
			<AppFooter version={version} appName="For All Learners" />
		</div>
	);
}
