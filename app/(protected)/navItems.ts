import type { NavItem } from "@/components/app-nav-dropdown";

export const navItems: NavItem[] = [
	{ label: "デッキ", href: "/decks", icon: "Grid", status: "enabled" },
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
		label: "メッセージ",
		href: "/messages",
		icon: "MessageSquare",
		status: "enabled",
	},
	{
		label: "プロフィール",
		href: "/profile",
		icon: "User",
		status: "enabled",
	},
	{
		label: "通知",
		href: "/notifications",
		icon: "Bell",
		status: "enabled",
		hasNotification: true,
	},
	{ label: "設定", href: "/settings", icon: "Settings", status: "enabled" },
	{ label: "ヘルプ", href: "/help", icon: "Star", status: "enabled" },
];
