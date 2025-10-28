"use client";

import Link from "next/link";

interface AppFooterProps {
	version?: string;
	appName?: string;
}

export function AppFooter({
	version,
	appName = "学習アプリ", // デフォルトのアプリ名。必要に応じて変更してください。
}: AppFooterProps) {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="py-6 mt-auto text-center text-xs text-muted-foreground border-t">
			<div className="container mx-auto px-6">
				<div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
					<span>
						© {currentYear} {appName}
						{version && ` v${version}`}
					</span>
					<span className="hidden sm:inline">|</span>
					<Link href="/privacy" className="hover:underline">
						プライバシーポリシー
					</Link>
					<span className="hidden sm:inline">|</span>
					<Link href="/terms" className="hover:underline">
						利用規約
					</Link>
					<span className="hidden sm:inline">|</span>
					<Link href="/changelog" className="hover:underline">
						更新履歴
					</Link>
					<span className="hidden sm:inline">|</span>
					<Link href="/milestones" className="hover:underline">
						マイルストーン
					</Link>
				</div>
			</div>
		</footer>
	);
}
