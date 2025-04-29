import type React from "react";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { Container } from "@/components/container";

interface DashboardShellProps {
	children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 items-center">
					<MainNav />
					<div className="flex flex-1 items-center justify-end space-x-4">
						<UserNav />
					</div>
				</div>
			</header>
			<main className="flex-1 space-y-4 p-8 pt-6">
				<Container>{children}</Container>
			</main>
		</div>
	);
}
