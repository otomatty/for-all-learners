"use client";

import Link from "next/link";
import { Logo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface UnauthHeaderProps {
	version?: string;
}

export function UnauthHeader({ version }: UnauthHeaderProps) {
	return (
		<header className="sticky top-0 z-50 bg-background bg-opacity-80 backdrop-blur-md border-b">
			<div className="container mx-auto flex items-center justify-between py-4 px-6">
				<Logo version={version} />
				<div className="flex items-center space-x-4">
					<ThemeToggle />
					<Button asChild variant="outline">
						<Link href="/auth/login">Googleログイン</Link>
					</Button>
				</div>
			</div>
		</header>
	);
}
