/**
 * LocaleSwitcher コンポーネント テスト
 *
 * DEPENDENCY MAP:
 *
 * Dependencies:
 *   ├─ components/LocaleSwitcher.tsx
 *   ├─ i18n/config.ts
 *   └─ lib/i18n/navigation.ts
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next-intl
const mockUseLocale = vi.fn(() => "ja");
vi.mock("next-intl", () => ({
	useLocale: () => mockUseLocale(),
}));

// Mock navigation
const mockReplace = vi.fn();
vi.mock("@/lib/i18n/navigation", () => ({
	useRouter: () => ({
		replace: mockReplace,
	}),
	usePathname: () => "/dashboard",
}));

// Mock i18n config
vi.mock("@/i18n/config", () => ({
	locales: ["ja", "en"] as const,
	localeNames: {
		ja: "日本語",
		en: "English",
	},
	defaultLocale: "ja",
}));

// Import after mocks
import { LocaleSwitcher } from "../LocaleSwitcher";

describe("LocaleSwitcher", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseLocale.mockReturnValue("ja");
	});

	it("should render the select component", () => {
		render(<LocaleSwitcher />);

		// Check for the trigger button
		const trigger = screen.getByRole("combobox");
		expect(trigger).toBeDefined();
	});

	it("should display current locale name in trigger", () => {
		render(<LocaleSwitcher />);

		const trigger = screen.getByRole("combobox");
		// The trigger should contain the current locale name
		expect(trigger.textContent).toContain("日本語");
	});

	it("should have correct aria attributes", () => {
		render(<LocaleSwitcher />);

		const trigger = screen.getByRole("combobox");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	it("should open dropdown when clicked", async () => {
		render(<LocaleSwitcher />);

		const trigger = screen.getByRole("combobox");
		fireEvent.click(trigger);

		await waitFor(() => {
			// After click, aria-expanded should be true
			expect(trigger).toHaveAttribute("aria-expanded", "true");
		});
	});

	it("should call router.replace when English option is selected", async () => {
		render(<LocaleSwitcher />);

		const trigger = screen.getByRole("combobox");
		fireEvent.click(trigger);

		await waitFor(() => {
			// Find the English option by role
			const options = screen.getAllByRole("option");
			const englishOption = options.find(
				(opt) => opt.textContent === "English",
			);
			expect(englishOption).toBeDefined();
			if (englishOption) {
				fireEvent.click(englishOption);
			}
		});

		expect(mockReplace).toHaveBeenCalledWith("/dashboard", { locale: "en" });
	});

	it("should have width class applied", () => {
		render(<LocaleSwitcher />);

		const trigger = screen.getByRole("combobox");
		expect(trigger.className).toContain("w-[180px]");
	});
});

describe("LocaleSwitcher with English locale", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseLocale.mockReturnValue("en");
	});

	it("should display English when locale is en", () => {
		render(<LocaleSwitcher />);

		const trigger = screen.getByRole("combobox");
		expect(trigger.textContent).toContain("English");
	});

	it("should call router.replace with ja when Japanese is selected", async () => {
		render(<LocaleSwitcher />);

		const trigger = screen.getByRole("combobox");
		fireEvent.click(trigger);

		await waitFor(() => {
			const options = screen.getAllByRole("option");
			const japaneseOption = options.find(
				(opt) => opt.textContent === "日本語",
			);
			expect(japaneseOption).toBeDefined();
			if (japaneseOption) {
				fireEvent.click(japaneseOption);
			}
		});

		expect(mockReplace).toHaveBeenCalledWith("/dashboard", { locale: "ja" });
	});
});
