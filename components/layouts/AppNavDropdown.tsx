"use client";

import {
	BarChart,
	BookOpen,
	Grip,
	LayoutList,
	type LucideIcon,
	Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { NavItem } from "@/lib/navigation/types";
import { cn } from "@/lib/utils";

// アイコン名とコンポーネントのマッピング
const iconMap: Record<string, LucideIcon> = {
	LayoutList,
	Target,
	BookOpen,
	BarChart,
};

interface AppNavDropdownProps {
	items: NavItem[];
}

export default function AppNavDropdown({ items = [] }: AppNavDropdownProps) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

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

	return (
		<>
			<style jsx>{`
				.truncate-text {
					display: -webkit-box;
					-webkit-box-orient: vertical;
					-webkit-line-clamp: 2;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.group:hover .truncate-text {
					-webkit-line-clamp: unset;
				}
			`}</style>
			<div className="relative" ref={containerRef}>
				<Button onClick={() => setOpen(!open)} variant="ghost" size="icon">
					<Grip className="w-4 h-4" />
				</Button>

				{open && (
					<div className="p-4 absolute right-0 mt-2 w-xs max-h-96 overflow-y-auto bg-white rounded-md shadow-lg ring-opacity-5 z-50 border border-border">
						<div className="p-2 grid grid-cols-3 gap-2">
							{items.map((item) => {
								const isDisabled =
									item.status === "disabled" || item.status === "coming-soon";
								const IconComponent = iconMap[item.icon] as LucideIcon;
								return (
									<Link
										key={item.href}
										href={isDisabled ? "#" : item.href}
										title={item.label}
										className={cn(
											"relative group flex flex-col items-center justify-center p-2 text-sm rounded-md w-full aspect-square",
											isDisabled
												? "cursor-not-allowed text-gray-400"
												: "hover:bg-gray-100 text-gray-700",
										)}
										onClick={(e) => {
											if (isDisabled) e.preventDefault();
											setOpen(false); // ここでドロップダウンを閉じる
										}}
									>
										{item.status === "demo" && (
											<span className="absolute top-1 left-1 text-xs font-medium text-blue-600">
												Demo
											</span>
										)}
										{item.status === "coming-soon" && (
											<span className="absolute top-1 left-1 text-xs font-medium text-orange-600">
												Coming Soon
											</span>
										)}
										{item.status === "new" && (
											<span className="absolute top-1 left-1 text-xs font-medium text-green-600">
												New
											</span>
										)}
										{item.hasNotification && (
											<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
										)}
										<IconComponent className="w-5 h-5 mb-1" />
										<span className="truncate-text text-center">
											{item.label}
										</span>
									</Link>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</>
	);
}
