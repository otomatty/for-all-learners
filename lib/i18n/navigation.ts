/**
 * i18n Navigation Utilities
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ components/LocaleSwitcher.tsx
 *   └─ app/(protected)/settings/_components/LanguageSettings.tsx
 *
 * Dependencies:
 *   └─ i18n/config.ts
 */

import { createNavigation } from "next-intl/navigation";
import { defaultLocale, locales } from "@/i18n/config";

export const { Link, redirect, usePathname, useRouter } = createNavigation({
	locales,
	defaultLocale,
	localePrefix: "as-needed",
});
