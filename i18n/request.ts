/**
 * i18n Request Configuration for next-intl
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ app/[locale]/layout.tsx
 *   └─ next.config.ts (via createNextIntlPlugin)
 *
 * Dependencies:
 *   └─ i18n/config.ts
 */

import { getRequestConfig } from "next-intl/server";
import { type Locale, locales } from "./config";

// 静的エクスポート時はheaders()を使用しないため、デフォルトロケールを使用
const isStaticExport = process.env.ENABLE_STATIC_EXPORT === "true";

export default getRequestConfig(async (params) => {
	// 静的エクスポート時は固定のロケールを使用
	// requestLocaleをawaitするとheaders()が呼び出されるため、完全にスキップ
	if (isStaticExport) {
		return {
			locale: "ja",
			messages: (await import("../messages/ja.json")).default,
		};
	}

	// This typically corresponds to the `[locale]` segment
	let locale = await params.requestLocale;

	// Ensure that a valid locale is used
	if (!locale || !locales.includes(locale as Locale)) {
		locale = "ja";
	}

	return {
		locale,
		messages: (await import(`../messages/${locale}.json`)).default,
	};
});
