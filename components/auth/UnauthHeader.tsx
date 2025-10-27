"use client";

import Link from "next/link";
import { Logo } from "@/components/layouts/SiteLogo";
import { PublicNavigation } from "@/components/public-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

interface UnauthHeaderProps {
	version?: string;
	isAuthenticated?: boolean; // 認証状態を受け取るための props を追加
}

export function UnauthHeader({ version, isAuthenticated }: UnauthHeaderProps) {
	return (
		<header className="sticky top-0 z-50 bg-background bg-opacity-80 backdrop-blur-md ">
			<div className="container mx-auto flex items-center justify-between py-4 px-6">
				<Logo version={version} />
				<PublicNavigation />
				<div className="flex items-center space-x-4">
					<ThemeToggle />
					<Button asChild variant="outline">
						<Link href="/inquiry">お問い合わせ</Link>
					</Button>
					{isAuthenticated ? (
						<Button asChild>
							<Link href="/dashboard">アプリへ</Link>
						</Button>
					) : (
						<Button asChild variant="outline">
							<Link href="/auth/login">ログイン</Link>
						</Button>
					)}
				</div>
			</div>
		</header>
	);
}
