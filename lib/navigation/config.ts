import type { AdminNavItem, MobileNavItem, NavItem } from "./types";

/**
 * デスクトップ用ナビゲーション項目
 * ドロップダウンメニューで使用される
 */
export const desktopNavItems: NavItem[] = [
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
	{ label: "レポート", href: "/reports", icon: "BarChart", status: "demo" },
	{
		label: "プラグイン",
		href: "/settings/plugins",
		icon: "Package",
		status: "enabled",
	},
	// {
	//   label: "自習室",
	//   href: "/study-room",
	//   icon: "DoorOpen",
	//   status: "coming-soon",
	// },
	// {
	//   label: "学習計画",
	//   href: "/plans",
	//   icon: "Calendar",
	//   status: "coming-soon",
	// },
];

/**
 * モバイル用ナビゲーション項目（一般ユーザー）
 * 主要な機能のみをシンプルに表示
 */
export const mobileUserNavItems: MobileNavItem[] = [
	{ href: "/learn", label: "学習を始める" },
	{ href: "/decks", label: "デッキ" },
	{ href: "/notes", label: "ノート" },
	{ href: "/goals", label: "目標" },
];

/**
 * モバイル用ナビゲーション項目（管理者）
 */
export const mobileAdminNavItems: MobileNavItem[] = [
	{ href: "/admin/users", label: "ユーザー一覧" },
	{ href: "/admin/changelog", label: "更新履歴" },
	{ href: "/admin/milestone", label: "マイルストーン" },
	{ href: "/admin/inquiries", label: "お問い合わせ" },
];

/**
 * 管理者用ナビゲーション項目（デスクトップ）
 */
export const adminNavItems: AdminNavItem[] = [
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

/**
 * ナビゲーション設定オブジェクト
 */
export const navigationConfig = {
	desktop: desktopNavItems,
	mobile: {
		user: mobileUserNavItems,
		admin: mobileAdminNavItems,
	},
	admin: adminNavItems,
} as const;
