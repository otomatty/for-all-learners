import { navigationConfig } from "@/lib/navigation/config";
import type {
	AdminNavItem,
	MobileNavItem,
	NavItem,
} from "@/lib/navigation/types";

/**
 * ナビゲーション項目を取得するカスタムフック
 * プラットフォーム（デスクトップ/モバイル）と権限（一般/管理者）に応じて
 * 適切なナビゲーション項目を返す
 */
export function useNavigation() {
	/**
	 * デスクトップ用ナビゲーション項目を取得
	 * @returns デスクトップドロップダウンメニュー用の項目
	 */
	const getDesktopNavItems = (): NavItem[] => {
		return navigationConfig.desktop;
	};

	/**
	 * モバイル用ナビゲーション項目を取得
	 * @param isAdmin - 管理者かどうか
	 * @returns モバイルメニュー用の項目
	 */
	const getMobileNavItems = (isAdmin: boolean): MobileNavItem[] => {
		return isAdmin
			? navigationConfig.mobile.admin
			: navigationConfig.mobile.user;
	};

	/**
	 * 管理者用デスクトップナビゲーション項目を取得
	 * @returns 管理者用ドロップダウンメニュー項目
	 */
	const getAdminNavItems = (): AdminNavItem[] => {
		return navigationConfig.admin;
	};

	/**
	 * 指定されたパスに基づいて現在アクティブな項目を判定
	 * @param pathname - 現在のパス
	 * @param items - ナビゲーション項目
	 * @returns アクティブな項目のhref（見つからない場合はnull）
	 */
	const getActiveItem = (
		pathname: string,
		items: (NavItem | MobileNavItem | AdminNavItem)[],
	): string | null => {
		for (const item of items) {
			// 完全一致
			if (item.href === pathname) {
				return item.href;
			}

			// パスの開始部分での一致（例: /notes/123 は /notes にマッチ）
			if (pathname.startsWith(`${item.href}/`)) {
				return item.href;
			}

			// サブアイテムがある場合はそちらもチェック
			if ("subItems" in item && item.subItems) {
				for (const subItem of item.subItems) {
					if (
						subItem.href === pathname ||
						pathname.startsWith(`${subItem.href}/`)
					) {
						return item.href; // 親項目のhrefを返す
					}
				}
			}
		}

		return null;
	};

	return {
		getDesktopNavItems,
		getMobileNavItems,
		getAdminNavItems,
		getActiveItem,
	};
}
