"use client";

import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// app-nav-dropdown.tsx から NavItemStatus と NavItem インターフェースを参考に定義
export type NavItemStatus =
	| "enabled"
	| "disabled"
	| "demo"
	| "coming-soon"
	| "new";

export interface AdminNavItem {
	label: string;
	href: string;
	icon: keyof typeof Icons; // アイコンプロパティを追加
	status: NavItemStatus; // ステータスプロパティを追加
}

export function AdminNav() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// ナビゲーションアイテムにアイコンとステータスを追加
	const navItems: AdminNavItem[] = [
		{
			href: "/admin/users",
			label: "ユーザー",
			icon: "Users",
			status: "enabled",
		},
		{
			href: "/admin/changelog",
			label: "更新履歴",
			icon: "History",
			status: "enabled",
		},
		{
			href: "/admin/milestone",
			label: "マイルストーン",
			status: "enabled",
			icon: "Milestone",
		},
		{
			href: "/admin/inquiries",
			label: "お問い合わせ",
			icon: "Mail",
			status: "enabled",
		},
	];

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const getIconComponent = (iconName: keyof typeof Icons): LucideIcon => {
		return Icons[iconName] as LucideIcon;
	};

	return (
		<div className="relative mr-4" ref={containerRef}>
			<Button
				onClick={() => setOpen(!open)}
				aria-label="管理者メニューを開く"
				variant="ghost"
				size="icon"
			>
				<Icons.Grip className="w-5 h-5" />
			</Button>

			{open && (
				<div className="p-4 absolute right-0 mt-2 w-64 max-h-96 overflow-y-auto bg-white rounded-md shadow-lg ring-opacity-5 z-50 border border-border">
					<div className="p-2 grid grid-cols-2 gap-2">
						{navItems.map((item) => {
							const IconComponent = getIconComponent(item.icon);
							const isActive = pathname === item.href;

							return (
								<Link
									key={item.href}
									href={item.href}
									title={item.label}
									className={cn(
										"group flex flex-col items-center justify-center p-3 text-sm rounded-md w-full aspect-square",
										"hover:bg-gray-100 text-gray-700",
										isActive ? "bg-gray-100 font-semibold" : "",
									)}
									onClick={() => setOpen(false)}
								>
									<IconComponent className="w-6 h-6 mb-1" />
									<span className="text-center text-xs">{item.label}</span>
								</Link>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
