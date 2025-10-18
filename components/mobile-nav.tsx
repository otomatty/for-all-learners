"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { UserNav } from "@/components/user-nav";
import { useNavigation } from "@/hooks/use-navigation";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";
import { SearchBar } from "./search-bar";

interface MobileNavProps {
	isAdmin: boolean;
	account: Database["public"]["Tables"]["accounts"]["Row"];
	plan: Database["public"]["Tables"]["plans"]["Row"] | null;
}

export function MobileNav({ isAdmin, account, plan }: MobileNavProps) {
	const pathname = usePathname();
	const { getMobileNavItems, getActiveItem } = useNavigation();

	const navItems = getMobileNavItems(isAdmin);
	const activeItem = getActiveItem(pathname, navItems);

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
					<div className="hidden md:block w-full max-w-md">
						{isAdmin ? <div /> : <SearchBar />}
					</div>
					<nav className="flex flex-col py-2">
						{navItems.map((item) => (
							<SheetClose asChild key={item.href}>
								<Link
									href={item.href}
									className={cn(
										"block px-4 py-2 text-sm transition-colors hover:bg-gray-100",
										activeItem === item.href
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
						<UserNav isAdmin={isAdmin} account={account} plan={plan} />
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
