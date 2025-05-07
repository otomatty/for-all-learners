import type { NavItem } from "@/components/app-nav-dropdown";

export const navItems: NavItem[] = [
	{ label: "デッキ", href: "/decks", icon: "LayoutList", status: "enabled" },
	{
		label: "ノート",
		href: "/pages",
		icon: "BookOpen",
		status: "enabled",
		hasNotification: true,
	},
	{ label: "レポート", href: "/reports", icon: "BarChart", status: "new" },
	{
		label: "学習計画",
		href: "/plans",
		icon: "Calendar",
		status: "coming-soon",
	},
	{
		label: "通知",
		href: "/notifications",
		icon: "Bell",
		status: "enabled",
		hasNotification: true,
	},
];
