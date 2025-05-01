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
				<span className="font-bold">F.A.L.</span>
			</Link>
			<nav className="flex items-center space-x-6 text-sm font-medium">
				<Link
					href="/learn"
					className={cn(
						"transition-colors hover:text-foreground/80",
						pathname === "/learn" ? "text-foreground" : "text-foreground/60",
					)}
				>
					学習を始める
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
