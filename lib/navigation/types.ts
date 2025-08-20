import type * as Icons from "lucide-react";

export type NavItemStatus =
	| "enabled"
	| "disabled"
	| "demo"
	| "coming-soon"
	| "new";

export interface BaseNavItem {
	label: string;
	href: string;
	icon: keyof typeof Icons;
	status: NavItemStatus;
	hasNotification?: boolean;
}

export interface NavItem extends BaseNavItem {
	subItems?: Array<{
		label: string;
		href: string;
	}>;
}

export interface MobileNavItem {
	label: string;
	href: string;
}

export interface AdminNavItem extends BaseNavItem {
	// 管理者専用の追加プロパティがあれば将来的に追加
}
