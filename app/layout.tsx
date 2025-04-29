import type React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "資格学習支援アプリ",
	description: "効率的かつ効果的に資格学習を進めるためのアプリケーション",
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
