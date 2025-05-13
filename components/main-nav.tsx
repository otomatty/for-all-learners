"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MainNav() {
	const pathname = usePathname();

	return (
		<div className="mr-4 flex">
			<nav className="flex items-center space-x-6 text-sm font-medium">
				<Link
					href="/decks"
					className={cn(
						"transition-colors hover:text-foreground/80",
						pathname?.startsWith("/decks")
							? "text-foreground"
							: "text-foreground/60",
					)}
				>
					デッキ
				</Link>
				<Link
					href="/pages"
					className={cn(
						"transition-colors hover:text-foreground/80",
						pathname?.startsWith("/pages")
							? "text-foreground"
							: "text-foreground/60",
					)}
				>
					ノート
				</Link>
			</nav>
		</div>
	);
}
