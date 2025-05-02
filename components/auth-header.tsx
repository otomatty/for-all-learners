"use client";

import { MainNav } from "@/components/main-nav";
import { AdminNav } from "@/components/admin-nav";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { Logo } from "@/components/site-logo";
import { usePathname } from "next/navigation";

interface AuthHeaderProps {
	version?: string;
	/** 現在のユーザーが管理者かどうか */
	isAdmin: boolean;
}

export function AuthHeader({ version, isAdmin }: AuthHeaderProps) {
	const pathname = usePathname();
	const showAdminNav = isAdmin && pathname.startsWith("/admin");
	return (
		<header className="sticky top-0 z-50 bg-background bg-opacity-80 backdrop-blur-md border-b border-border">
			<div className="container mx-auto flex items-center justify-between py-4 px-6">
				<div className="flex justify-between items-center w-full">
					<Logo version={version} href={showAdminNav ? "/admin" : "/"} />
					<div className="hidden md:flex">
						{showAdminNav ? <AdminNav /> : <MainNav />}
					</div>
					<MobileNav isAdmin={showAdminNav} />
				</div>
				<div className="hidden md:flex items-center space-x-4">
					<ThemeToggle />
					<UserNav isAdmin={isAdmin} />
				</div>
			</div>
		</header>
	);
}
