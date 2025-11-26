/**
 * 翻訳メッセージ テスト
 *
 * DEPENDENCY MAP:
 *
 * Dependencies:
 *   ├─ messages/ja.json
 *   └─ messages/en.json
 */

import { describe, expect, it } from "vitest";
import enMessages from "../en.json";
import jaMessages from "../ja.json";

// Helper to get all keys from a nested object
function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
	const keys: string[] = [];
	for (const key in obj) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (typeof obj[key] === "object" && obj[key] !== null) {
			keys.push(...getAllKeys(obj[key] as Record<string, unknown>, fullKey));
		} else {
			keys.push(fullKey);
		}
	}
	return keys;
}

// Helper to get value by dot-notation key
function getValueByKey(obj: Record<string, unknown>, key: string): unknown {
	const keys = key.split(".");
	let value: unknown = obj;
	for (const k of keys) {
		if (value && typeof value === "object" && k in value) {
			value = (value as Record<string, unknown>)[k];
		} else {
			return undefined;
		}
	}
	return value;
}

describe("Translation Messages", () => {
	describe("Structure", () => {
		it("should have the same top-level keys in ja and en", () => {
			const jaKeys = Object.keys(jaMessages).sort();
			const enKeys = Object.keys(enMessages).sort();
			expect(jaKeys).toEqual(enKeys);
		});

		it("should have the same nested structure in ja and en", () => {
			const jaAllKeys = getAllKeys(jaMessages).sort();
			const enAllKeys = getAllKeys(enMessages).sort();
			expect(jaAllKeys).toEqual(enAllKeys);
		});
	});

	describe("Japanese (ja) Messages", () => {
		it("should have common namespace", () => {
			expect(jaMessages.common).toBeDefined();
			expect(jaMessages.common.loading).toBe("読み込み中...");
			expect(jaMessages.common.save).toBe("保存");
			expect(jaMessages.common.cancel).toBe("キャンセル");
		});

		it("should have navigation namespace", () => {
			expect(jaMessages.navigation).toBeDefined();
			expect(jaMessages.navigation.dashboard).toBe("ダッシュボード");
			expect(jaMessages.navigation.notes).toBe("ノート");
		});

		it("should have auth namespace", () => {
			expect(jaMessages.auth).toBeDefined();
			expect(jaMessages.auth.login).toBe("ログイン");
			expect(jaMessages.auth.loginWithGoogle).toBe("Googleでログイン");
		});

		it("should have dashboard namespace with interpolation", () => {
			expect(jaMessages.dashboard).toBeDefined();
			expect(jaMessages.dashboard.welcomeMessage).toContain("{name}");
		});

		it("should have settings namespace", () => {
			expect(jaMessages.settings).toBeDefined();
			expect(jaMessages.settings.language).toBe("言語");
			expect(jaMessages.settings.theme).toBe("テーマ");
		});
	});

	describe("English (en) Messages", () => {
		it("should have common namespace", () => {
			expect(enMessages.common).toBeDefined();
			expect(enMessages.common.loading).toBe("Loading...");
			expect(enMessages.common.save).toBe("Save");
			expect(enMessages.common.cancel).toBe("Cancel");
		});

		it("should have navigation namespace", () => {
			expect(enMessages.navigation).toBeDefined();
			expect(enMessages.navigation.dashboard).toBe("Dashboard");
			expect(enMessages.navigation.notes).toBe("Notes");
		});

		it("should have auth namespace", () => {
			expect(enMessages.auth).toBeDefined();
			expect(enMessages.auth.login).toBe("Login");
			expect(enMessages.auth.loginWithGoogle).toBe("Login with Google");
		});

		it("should have dashboard namespace with interpolation", () => {
			expect(enMessages.dashboard).toBeDefined();
			expect(enMessages.dashboard.welcomeMessage).toContain("{name}");
		});

		it("should have settings namespace", () => {
			expect(enMessages.settings).toBeDefined();
			expect(enMessages.settings.language).toBe("Language");
			expect(enMessages.settings.theme).toBe("Theme");
		});
	});

	describe("Interpolation Variables", () => {
		const interpolationKeys = [
			"dashboard.welcomeMessage",
			"decks.cardCount",
			"learn.cardsRemaining",
			"goals.progress",
		];

		it("should have matching interpolation variables in ja and en", () => {
			for (const key of interpolationKeys) {
				const jaValue = getValueByKey(jaMessages, key) as string;
				const enValue = getValueByKey(enMessages, key) as string;

				// Extract variables like {name}, {count}, etc.
				const jaVars = jaValue.match(/\{[^}]+\}/g) || [];
				const enVars = enValue.match(/\{[^}]+\}/g) || [];

				expect(jaVars.sort()).toEqual(enVars.sort());
			}
		});
	});

	describe("Completeness", () => {
		it("should not have empty strings in ja", () => {
			const allKeys = getAllKeys(jaMessages);
			for (const key of allKeys) {
				const value = getValueByKey(jaMessages, key);
				expect(value).not.toBe("");
			}
		});

		it("should not have empty strings in en", () => {
			const allKeys = getAllKeys(enMessages);
			for (const key of allKeys) {
				const value = getValueByKey(enMessages, key);
				expect(value).not.toBe("");
			}
		});

		it("should have all required namespaces", () => {
			const requiredNamespaces = [
				"common",
				"navigation",
				"auth",
				"dashboard",
				"notes",
				"decks",
				"cards",
				"learn",
				"goals",
				"settings",
				"profile",
				"errors",
			];

			for (const namespace of requiredNamespaces) {
				expect(jaMessages).toHaveProperty(namespace);
				expect(enMessages).toHaveProperty(namespace);
			}
		});
	});

	describe("Error Messages", () => {
		it("should have all error types in ja", () => {
			expect(jaMessages.errors.notFound).toBe("ページが見つかりません");
			expect(jaMessages.errors.unauthorized).toBe("ログインが必要です");
			expect(jaMessages.errors.forbidden).toBe("アクセスが拒否されました");
			expect(jaMessages.errors.serverError).toBe(
				"サーバーエラーが発生しました",
			);
			expect(jaMessages.errors.networkError).toBe(
				"ネットワークエラーが発生しました",
			);
		});

		it("should have all error types in en", () => {
			expect(enMessages.errors.notFound).toBe("Page not found");
			expect(enMessages.errors.unauthorized).toBe("Login required");
			expect(enMessages.errors.forbidden).toBe("Access denied");
			expect(enMessages.errors.serverError).toBe("Server error occurred");
			expect(enMessages.errors.networkError).toBe("Network error occurred");
		});
	});
});
