"use client";

import { useEffect } from "react";
import { useUserSettings } from "@/hooks/user_settings/useUserSettings";

/**
 * Client Theme Provider
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/layout.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ hooks/user_settings/useUserSettings.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function ClientThemeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: settings, isLoading } = useUserSettings();

	useEffect(() => {
		if (!isLoading && settings) {
			// テーマを動的に適用
			const themeClass = `theme-${settings.theme || "light"}`;
			const darkClass =
				settings.mode === "dark"
					? "dark"
					: settings.mode === "light"
						? ""
						: // system mode: check system preference
							window.matchMedia("(prefers-color-scheme: dark)").matches
							? "dark"
							: "";

			// 既存のクラスを保持しつつ、テーマ関連のクラスを更新
			const htmlElement = document.documentElement;
			const currentClasses = htmlElement.className
				.split(" ")
				.filter(
					(cls) =>
						!cls.startsWith("theme-") && cls !== "dark" && cls !== "light",
				);
			htmlElement.className = [...currentClasses, darkClass, themeClass]
				.filter(Boolean)
				.join(" ");
		}
	}, [settings, isLoading]);

	return <>{children}</>;
}
