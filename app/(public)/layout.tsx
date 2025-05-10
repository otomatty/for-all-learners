import type React from "react";
import { version } from "../../package.json";
import { UnauthHeader } from "@/components/unauth-header";
// Supabase のサーバーサイドクライアントを作成する関数をインポートします。
// パスはプロジェクトの構成に合わせて調整してください。
import { createClient } from "@/lib/supabase/server"; // 例: utils/supabase/server.ts
import { cookies } from "next/headers";

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
			<footer className="bg-white py-6 border-t">
				<div className="container mx-auto text-center text-gray-500">
					&copy; {new Date().getFullYear()} 資格学習支援アプリ ForAllLearners
				</div>
			</footer>
		</div>
	);
}
