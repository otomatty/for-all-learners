"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import FloatingToolbar from "./floating-toolbar";
import MobileFabToolbar from "./mobile-fab-toolbar";
import type { ToolbarMenuItemsProps } from "./toolbar-menu-items";

interface ResponsiveToolbarProps extends ToolbarMenuItemsProps {}

export default function ResponsiveToolbar(props: ResponsiveToolbarProps) {
	const isMobile = useIsMobile();

	// モバイル判定が初期化されるまで何も表示しない（ヒドレーションエラー防止）
	if (isMobile === undefined) {
		return null;
	}

	return isMobile ? (
		<MobileFabToolbar {...props} />
	) : (
		<FloatingToolbar {...props} />
	);
}
