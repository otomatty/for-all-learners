"use client";

import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { Logo } from "@/components/site-logo";

interface AuthHeaderProps {
	version?: string;
}

export function AuthHeader({ version }: AuthHeaderProps) {
	return (
		<header className="sticky top-0 z-50 bg-background bg-opacity-80 backdrop-blur-md border-b border-border">
			<div className="container mx-auto flex items-center justify-between py-4 px-6">
				<div className="flex justify-between items-center w-full">
					<Logo version={version} />
					<div className="hidden md:flex">
						<MainNav />
					</div>
					<MobileNav />
				</div>
				<div className="hidden md:flex items-center space-x-4">
					<ThemeToggle />
					<UserNav />
				</div>
			</div>
		</header>
	);
}
