/**
 * i18n Configuration
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ middleware.ts
 *   ├─ i18n/request.ts
 *   └─ lib/i18n/navigation.ts
 */

export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ja";

export const localeNames: Record<Locale, string> = {
	ja: "日本語",
	en: "English",
};
