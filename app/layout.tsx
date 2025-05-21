// import "shiki/themes/tokyo-night.css"; // Import Shiki CSS theme
// import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";
import { getUserSettings } from "@/app/_actions/user_settings";
import { Providers } from "@/components/providers";
import type { Viewport } from "next";
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
	// サーバーサイドでユーザー設定を取得
	const { theme, mode } = await getUserSettings();
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
				<link
					rel="stylesheet"
					href="https://cdn.jsdelivr.net/npm/shiki@0.10.1/themes/tokyo-night.css"
				/>
			</head>
			<body className={inter.className} suppressHydrationWarning>
				<Providers theme={theme} mode={mode as "light" | "dark" | "system"}>
					{children}
				</Providers>
			</body>
		</html>
	);
}
