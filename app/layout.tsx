// import "shiki/themes/tokyo-night.css"; // Import Shiki CSS theme
// import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";
import type { Viewport } from "next";
import { ClientThemeProvider } from "@/components/layouts/ClientThemeProvider";
import { Providers } from "@/components/providers";
import { getUserSettingsTheme } from "@/lib/services/userSettingsService";
import { createClient } from "@/lib/supabase/server";
import "tiptap-extension-code-block-shiki";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "F.A.L. | 「理解」するための学習アプリ",
	description:
		"F.A.L(For All Learners)は、「理解する」学習のために設計されたAIをベースにしたアプリです。",
	manifest: "/manifest.json",
};

export const viewport: Viewport = {
	themeColor: "#ffffff",
};

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// 静的エクスポート時はcookies()を使用できないため、デフォルト値を使用
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	let theme = "light";
	let mode: "light" | "dark" | "system" = "system";

	if (!isStaticExport) {
		try {
			// サーバーサイドでユーザー設定を取得（既存フックのロジックを再利用）
			const supabase = await createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (user) {
				const settings = await getUserSettingsTheme(user.id);
				theme = settings.theme;
				mode = settings.mode;
			}
		} catch (_error) {
			// エラー時はデフォルト値を使用
		}
	}

	const themeClass = `theme-${theme}`;
	const darkClass = mode === "dark" ? "dark" : "";

	return (
		<html
			lang="ja"
			className={`${darkClass} ${themeClass}`}
			suppressHydrationWarning
		>
			<head>
				<link
					rel="stylesheet"
					href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css"
				/>
				{/* Light theme for code blocks */}
				<link
					rel="stylesheet"
					href="https://cdn.jsdelivr.net/npm/shiki@0.10.1/themes/github-light.css"
					className="shiki-light-theme"
				/>
				{/* Dark theme for code blocks */}
				<link
					rel="stylesheet"
					href="https://cdn.jsdelivr.net/npm/shiki@0.10.1/themes/tokyo-night.css"
					className="shiki-dark-theme"
				/>
			</head>
			<body className={inter.className} suppressHydrationWarning>
				<Providers theme={theme} mode={mode as "light" | "dark" | "system"}>
					{isStaticExport ? (
						<ClientThemeProvider>{children}</ClientThemeProvider>
					) : (
						children
					)}
				</Providers>
			</body>
		</html>
	);
}
