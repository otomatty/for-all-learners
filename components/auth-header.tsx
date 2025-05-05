"use client";

import { AdminNav } from "@/components/admin-nav";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { Logo } from "@/components/site-logo";
import { usePathname } from "next/navigation";
import AppNavDropdown, { type NavItem } from "@/components/app-nav-dropdown";
import { PageHelpButton } from "@/components/PageHelpButton";
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
	TooltipProvider,
} from "@/components/ui/tooltip";
import { HelpCircleIcon } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

interface AuthHeaderProps {
	version?: string;
	/** 現在のユーザーが管理者かどうか */
	isAdmin: boolean;
	appNavItems?: NavItem[];
	/** ヘルプ動画の音声再生設定 */
	playAudio: boolean;
}

export function AuthHeader({
	version,
	isAdmin,
	appNavItems = [],
	playAudio,
}: AuthHeaderProps) {
	const pathname = usePathname();
	const showAdminNav = isAdmin && pathname.startsWith("/admin");
	return (
		<header className="sticky top-0 z-50 bg-background bg-opacity-80 backdrop-blur-md border-b border-border">
			<div className="container mx-auto flex items-center justify-between py-4 px-6 gap-8">
				<div className="flex items-center flex-1 gap-8">
					<Logo version={version} href={showAdminNav ? "/admin" : "/"} />
					<div className="w-full max-w-md">
						{showAdminNav ? <div /> : <SearchBar />}
					</div>
				</div>
				<div className="hidden md:flex gap-4 items-center">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<PageHelpButton
									triggerIcon={<HelpCircleIcon />}
									playAudio={playAudio}
								/>
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
								<UserNav isAdmin={isAdmin} />
							</TooltipTrigger>
							<TooltipContent>ユーザーメニュー</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<MobileNav isAdmin={showAdminNav} />
			</div>
		</header>
	);
}
