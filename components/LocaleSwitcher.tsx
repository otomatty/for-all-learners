"use client";

/**
 * LocaleSwitcher Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ app/(protected)/settings/_components/LanguageSettings.tsx
 *   └─ components/layouts/Header.tsx (future)
 *
 * Dependencies:
 *   ├─ i18n/config.ts
 *   └─ lib/i18n/navigation.ts
 */

import { useLocale } from "next-intl";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { type Locale, localeNames, locales } from "@/i18n/config";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

export function LocaleSwitcher() {
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();

	function onSelectChange(value: string) {
		router.replace(pathname, { locale: value as Locale });
	}

	return (
		<Select defaultValue={locale} onValueChange={onSelectChange}>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="言語を選択" />
			</SelectTrigger>
			<SelectContent>
				{locales.map((loc) => (
					<SelectItem key={loc} value={loc}>
						{localeNames[loc]}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
