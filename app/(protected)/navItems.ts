import type { NavItem } from "@/components/app-nav-dropdown";

export const navItems: NavItem[] = [
	{ label: "デッキ", href: "/decks", icon: "LayoutList", status: "enabled" },
	{
		label: "ノート",
		href: "/notes",
		icon: "BookOpen",
		status: "enabled",
	},
	{ label: "ページ", href: "/pages", icon: "FileText", status: "enabled" },
	{ label: "レポート", href: "/reports", icon: "BarChart", status: "demo" },
	// {
	// 	label: "自習室",
	// 	href: "/study-room",
	// 	icon: "DoorOpen",
	// 	status: "coming-soon",
	// },
	// {
	// 	label: "学習計画",
	// 	href: "/plans",
	// 	icon: "Calendar",
	// 	status: "coming-soon",
	// },
];
