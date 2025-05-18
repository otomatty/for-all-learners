"use client";

import { AdminNav } from "@/components/admin-nav";
import AppNavDropdown, { type NavItem } from "@/components/app-nav-dropdown";
import { MobileNav } from "@/components/mobile-nav";
import { PageHelpButton } from "@/components/page-help-button";
import { SearchBar } from "@/components/search-bar";
import { Logo } from "@/components/site-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserNav } from "@/components/user-nav";
import { useActiveUsers } from "@/hooks/use-active-users";
import { createClient } from "@/lib/supabase/client"; // Supabaseクライアントのパスを適宜修正してください
import { UsersIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Database } from "@/types/database.types";

export interface AuthHeaderProps {
	version?: string;
	/** 現在のユーザーが管理者かどうか */
	isAdmin: boolean;
	appNavItems?: NavItem[];
	/** ヘルプ動画の音声再生設定 */
	playAudio: boolean;
	/** カレントユーザーのアカウント情報 */
	account: Database["public"]["Tables"]["accounts"]["Row"];
	/** ユーザーのプラン情報 */
	plan: Database["public"]["Tables"]["plans"]["Row"] | null;
}

export function AuthHeader({
	version,
	isAdmin,
	appNavItems = [],
	playAudio,
	account,
	plan,
}: AuthHeaderProps) {
	const pathname = usePathname();
	const showAdminNav = isAdmin && pathname.startsWith("/admin");
	const activeUsers = useActiveUsers(createClient());

	return (
		<header className="sticky top-0 z-50 bg-background bg-opacity-80 backdrop-blur-md border-b border-border">
			<div className="container mx-auto flex items-center justify-between py-2 px-6 gap-8">
				<div className="flex items-center flex-1 gap-8">
					<Logo
						version={version}
						href={showAdminNav ? "/admin" : "/dashboard"}
					/>
					<div className="hidden md:block w-full max-w-md">
						{showAdminNav ? <div /> : <SearchBar />}
					</div>
				</div>
				<div className="hidden md:flex gap-4 items-center">
					<TooltipProvider>
						{activeUsers !== null && (
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex items-center gap-1 text-sm text-muted-foreground cursor-default">
										<UsersIcon className="h-4 w-4" />
										<span>{activeUsers}</span>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>オンライン中のユーザー数</p>
								</TooltipContent>
							</Tooltip>
						)}
						<Tooltip>
							<TooltipTrigger asChild>
								<PageHelpButton playAudio={playAudio} />
							</TooltipTrigger>
							<TooltipContent>操作ガイド</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<ThemeToggle />
							</TooltipTrigger>
							<TooltipContent>テーマ切替</TooltipContent>
						</Tooltip>
						<div className="hidden md:flex">
							{showAdminNav ? (
								<AdminNav />
							) : (
								<Tooltip>
									<TooltipTrigger asChild>
										<AppNavDropdown items={appNavItems} />
									</TooltipTrigger>
									<TooltipContent>ナビゲーションメニュー</TooltipContent>
								</Tooltip>
							)}
						</div>

						<Tooltip>
							<TooltipTrigger asChild>
								<UserNav isAdmin={isAdmin} account={account} plan={plan} />
							</TooltipTrigger>
							<TooltipContent>ユーザーメニュー</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<MobileNav isAdmin={showAdminNav} account={account} plan={plan} />
			</div>
		</header>
	);
}
