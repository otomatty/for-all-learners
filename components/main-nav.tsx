"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
					href="/notes"
					className={cn(
						"transition-colors hover:text-foreground/80",
						pathname?.startsWith("/notes") || pathname?.startsWith("/pages")
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
