"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrainCircuit } from "lucide-react";

export function MainNav() {
	const pathname = usePathname();

	return (
		<div className="mr-4 flex">
			<Link href="/" className="mr-6 flex items-center space-x-2">
				<BrainCircuit className="h-6 w-6" />
				<span className="font-bold">For All Learners</span>
			</Link>
			<nav className="flex items-center space-x-6 text-sm font-medium">
				<Link
					href="/dashboard"
					className={cn(
						"transition-colors hover:text-foreground/80",
						pathname === "/dashboard"
							? "text-foreground"
							: "text-foreground/60",
					)}
				>
					ダッシュボード
				</Link>
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
						pathname?.startsWith("/notes")
							? "text-foreground"
							: "text-foreground/60",
					)}
				>
					ノート
				</Link>
				<Link
					href="/review"
					className={cn(
						"transition-colors hover:text-foreground/80",
						pathname === "/review" ? "text-foreground" : "text-foreground/60",
					)}
				>
					復習
				</Link>
			</nav>
		</div>
	);
}
