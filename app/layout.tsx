import type React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "F.A.L. | 「理解」するための学習アプリ",
	description:
		"F.A.L(For All Learners)は、「理解する」学習のために設計されたAIをベースにしたアプリです。",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja" suppressHydrationWarning>
			<body className={inter.className} suppressHydrationWarning>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
