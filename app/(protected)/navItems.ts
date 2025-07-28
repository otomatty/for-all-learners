import type { NavItem } from "@/components/app-nav-dropdown";

export const navItems: NavItem[] = [
	{ label: "デッキ", href: "/decks", icon: "LayoutList", status: "enabled" },
	{ label: "目標", href: "/goals", icon: "Target", status: "enabled" },
	{
		label: "ノート",
		href: "/notes",
		icon: "BookOpen",
		status: "enabled",
		subItems: [
			{ label: "ノート一覧", href: "/notes" },
			{ label: "エクスプローラー", href: "/notes/explorer" },
		],
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
