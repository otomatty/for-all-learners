"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import {
	Sheet,
	SheetTrigger,
	SheetContent,
	SheetClose,
	SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";

export function MobileNav() {
	const pathname = usePathname();

	const navItems = [
		{ href: "/learn", label: "学習を始める" },
		{ href: "/decks", label: "デッキ" },
		{ href: "/pages", label: "ノート" },
	];

	return (
		<div className="md:hidden">
			<Sheet>
				<SheetTrigger asChild>
					<button
						type="button"
						aria-label="Open menu"
						className="p-2 focus:outline-none"
					>
						<Menu className="h-6 w-6" />
					</button>
				</SheetTrigger>
				<SheetContent side="right">
					<SheetTitle className="sr-only">メニュー</SheetTitle>
					<nav className="flex flex-col py-2">
						{navItems.map((item) => (
							<SheetClose asChild key={item.href}>
								<Link
									href={item.href}
									className={cn(
										"block px-4 py-2 text-sm transition-colors hover:bg-gray-100",
										pathname === item.href
											? "font-semibold text-foreground"
											: "text-foreground/60",
									)}
								>
									{item.label}
								</Link>
							</SheetClose>
						))}
					</nav>
					<div className="mt-4 px-4 flex flex-col space-y-2">
						<ThemeToggle />
						<UserNav />
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
