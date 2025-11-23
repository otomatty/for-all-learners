/**
 * Tests for Service Worker control utility
 *
 * Test Coverage:
 * - TC-001: 正常系 - Tauri環境ではService Workerを登録しない
 * - TC-002: 正常系 - Web環境ではService Workerを登録する
 * - TC-003: エッジケース - Service Worker APIが利用できない場合
 * - TC-004: エッジケース - 既にService Workerが登録されている場合
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanupTauriMock, setupTauriMock } from "../../auth/__tests__/helpers";
import { shouldRegisterServiceWorker, registerServiceWorker } from "../service-worker";

describe("shouldRegisterServiceWorker", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanupTauriMock();
	});

	// TC-001: 正常系 - Tauri環境ではService Workerを登録しない
	test("TC-001: Should return false in Tauri environment", () => {
		setupTauriMock();

		expect(shouldRegisterServiceWorker()).toBe(false);
	});

	// TC-002: 正常系 - Web環境ではService Workerを登録する
	test("TC-002: Should return true in web environment", () => {
		// window.__TAURI__ を設定しない

		expect(shouldRegisterServiceWorker()).toBe(true);
	});

	// TC-003: エッジケース - windowが未定義の場合
	test("TC-003: Should return false when window is undefined", () => {
		const originalWindow = global.window;
		// @ts-expect-error - Testing edge case
		delete global.window;

		expect(shouldRegisterServiceWorker()).toBe(false);

		global.window = originalWindow;
	});
});

describe("registerServiceWorker", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Service Worker APIをモック
		Object.defineProperty(navigator, "serviceWorker", {
			value: {
				register: vi.fn().mockResolvedValue({
					update: vi.fn(),
					unregister: vi.fn(),
				}),
			},
			configurable: true,
			writable: true,
		});
	});

	afterEach(() => {
		cleanupTauriMock();
	});

	// TC-001: 正常系 - Web環境でService Workerを登録する
	test("TC-001: Should register service worker in web environment", async () => {
		// window.__TAURI__ を設定しない

		await registerServiceWorker();

		expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js", {
			scope: "/",
		});
	});

	// TC-002: 正常系 - Tauri環境ではService Workerを登録しない
	test("TC-002: Should not register service worker in Tauri environment", async () => {
		setupTauriMock();

		await registerServiceWorker();

		expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
	});

	// TC-003: エッジケース - Service Worker APIが利用できない場合
	test("TC-003: Should handle missing Service Worker API gracefully", async () => {
		// @ts-expect-error - Testing edge case
		delete navigator.serviceWorker;

		// エラーが発生しないことを確認
		await expect(registerServiceWorker()).resolves.not.toThrow();
	});

	// TC-004: エッジケース - Service Worker登録が失敗した場合
	test("TC-004: Should handle registration failure gracefully", async () => {
		const mockError = new Error("Registration failed");
		Object.defineProperty(navigator, "serviceWorker", {
			value: {
				register: vi.fn().mockRejectedValue(mockError),
			},
			configurable: true,
			writable: true,
		});

		// エラーが発生しないことを確認（エラーハンドリング済み）
		await expect(registerServiceWorker()).resolves.not.toThrow();
	});
});

