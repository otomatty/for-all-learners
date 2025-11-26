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

export default getRequestConfig(async ({ requestLocale }) => {
	// This typically corresponds to the `[locale]` segment
	let locale = await requestLocale;

	// Ensure that a valid locale is used
	if (!locale || !locales.includes(locale as Locale)) {
		locale = "ja";
	}

	return {
		locale,
		messages: (await import(`../messages/${locale}.json`)).default,
	};
});
