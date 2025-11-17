/**
 * Tests for environment utility functions
 *
 * Test Coverage:
 * - TC-001: 正常系 - Tauri環境での判定
 * - TC-002: 正常系 - Web環境での判定
 * - TC-003: エッジケース - windowが未定義の場合
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanupTauriMock, setupTauriMock } from "../../auth/__tests__/helpers";
import { isTauri } from "../environment";

describe("isTauri", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanupTauriMock();
	});

	// TC-001: 正常系 - Tauri環境での判定
	test("TC-001: Should return true in Tauri environment", () => {
		setupTauriMock();

		expect(isTauri()).toBe(true);
	});

	// TC-002: 正常系 - Web環境での判定
	test("TC-002: Should return false in web environment", () => {
		// window.__TAURI__ を設定しない

		expect(isTauri()).toBe(false);
	});

	// TC-003: エッジケース - windowが未定義の場合
	test("TC-003: Should return false when window is undefined", () => {
		const originalWindow = global.window;
		// @ts-expect-error - Testing edge case
		delete global.window;

		expect(isTauri()).toBe(false);

		global.window = originalWindow;
	});
});
