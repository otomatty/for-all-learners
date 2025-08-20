// このファイルは非推奨です。
// 新しいナビゲーション設定は lib/navigation/config.ts を使用してください。
// 後方互換性のため一時的に残していますが、将来的に削除予定です。

import { navigationConfig } from "@/lib/navigation/config";

/**
 * @deprecated lib/navigation/config.ts の navigationConfig.desktop を使用してください
 */
export const navItems = navigationConfig.desktop;
