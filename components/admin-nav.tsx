"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav() {
	const pathname = usePathname();
	const navItems = [
		{ href: "/admin/users", label: "ユーザー" },
		{ href: "/admin/changelog", label: "更新履歴" },
		{ href: "/admin/announcements", label: "お知らせ" },
		{ href: "/admin/contact", label: "お問い合わせ" },
	];

	return (
		<div className="mr-4 flex">
			<nav className="flex items-center space-x-6 text-sm font-medium">
				{navItems.map((item) => (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"transition-colors hover:text-foreground/80",
							pathname === item.href ? "text-foreground" : "text-foreground/60",
						)}
					>
						{item.label}
					</Link>
				))}
			</nav>
		</div>
	);
}
