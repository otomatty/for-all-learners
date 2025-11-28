/**
 * i18n Configuration テスト
 *
 * DEPENDENCY MAP:
 *
 * Dependencies:
 *   └─ i18n/config.ts
 */

import { describe, expect, it } from "vitest";
import { defaultLocale, type Locale, localeNames, locales } from "../config";

describe("i18n Configuration", () => {
	describe("locales", () => {
		it("should have ja and en locales", () => {
			expect(locales).toContain("ja");
			expect(locales).toContain("en");
		});

		it("should have exactly 2 locales", () => {
			expect(locales).toHaveLength(2);
		});

		it("should be a readonly array", () => {
			// TypeScript ensures this at compile time, but we can verify the values are immutable
			expect(Object.isFrozen(locales)).toBe(false); // 'as const' doesn't freeze at runtime
			expect(locales[0]).toBe("ja");
			expect(locales[1]).toBe("en");
		});
	});

	describe("defaultLocale", () => {
		it("should be 'ja'", () => {
			expect(defaultLocale).toBe("ja");
		});

		it("should be included in locales", () => {
			expect(locales).toContain(defaultLocale);
		});
	});

	describe("localeNames", () => {
		it("should have display names for all locales", () => {
			for (const locale of locales) {
				expect(localeNames[locale]).toBeDefined();
				expect(typeof localeNames[locale]).toBe("string");
			}
		});

		it("should have correct Japanese display name", () => {
			expect(localeNames.ja).toBe("日本語");
		});

		it("should have correct English display name", () => {
			expect(localeNames.en).toBe("English");
		});
	});

	describe("Locale type", () => {
		it("should accept valid locales", () => {
			const validLocale: Locale = "ja";
			expect(validLocale).toBe("ja");

			const validLocale2: Locale = "en";
			expect(validLocale2).toBe("en");
		});

		it("should work with locale checking function", () => {
			const isValidLocale = (locale: string): locale is Locale => {
				return locales.includes(locale as Locale);
			};

			expect(isValidLocale("ja")).toBe(true);
			expect(isValidLocale("en")).toBe(true);
			expect(isValidLocale("fr")).toBe(false);
			expect(isValidLocale("de")).toBe(false);
		});
	});
});
