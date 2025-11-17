/**
 * Tests for Tauri-compatible Supabase client
 *
 * Test Coverage:
 * - TC-001: 正常系 - Tauri環境でのクライアント作成
 * - TC-002: 正常系 - Web環境でのクライアント作成
 * - TC-003: 異常系 - 環境変数が不足している場合
 * - TC-004: エッジケース - windowが未定義の場合
 */

import { createBrowserClient } from "@supabase/ssr";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanupTauriMock, setupTauriMock } from "../../auth/__tests__/helpers";
import { createClient } from "../tauri-client";

// Mock @supabase/ssr
vi.mock("@supabase/ssr", () => ({
	createBrowserClient: vi.fn(),
}));

describe("createClient (Tauri-compatible)", () => {
	const originalEnv = process.env;
	const mockCreateBrowserClient = vi.mocked(createBrowserClient);

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = {
			...originalEnv,
			NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
			NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		};
		mockCreateBrowserClient.mockReturnValue(
			{} as ReturnType<typeof createBrowserClient>,
		);
	});

	afterEach(() => {
		process.env = originalEnv;
		cleanupTauriMock();
	});

	// TC-001: 正常系 - Tauri環境でのクライアント作成
	test("TC-001: Should create client with Tauri-specific settings", () => {
		setupTauriMock();

		createClient();

		expect(mockCreateBrowserClient).toHaveBeenCalledWith(
			"https://test.supabase.co",
			"test-anon-key",
			{
				auth: {
					storage: {
						getItem: expect.any(Function),
						setItem: expect.any(Function),
						removeItem: expect.any(Function),
					},
					persistSession: true,
					autoRefreshToken: true,
					detectSessionInUrl: false,
				},
			},
		);
	});

	// TC-002: 正常系 - Web環境でのクライアント作成
	test("TC-002: Should create client with web-specific settings", () => {
		// window.__TAURI__ を設定しない

		createClient();

		expect(mockCreateBrowserClient).toHaveBeenCalledWith(
			"https://test.supabase.co",
			"test-anon-key",
			{
				auth: {
					storage: undefined,
					persistSession: true,
					autoRefreshToken: true,
					detectSessionInUrl: true,
				},
			},
		);
	});

	// TC-003: 異常系 - 環境変数が不足している場合
	test("TC-003: Should throw error when env vars are missing", () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = "";
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";

		expect(() => createClient()).toThrow(
			"Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
		);
	});

	// TC-004: エッジケース - windowが未定義の場合
	test("TC-004: Should handle undefined window gracefully", () => {
		const originalWindow = global.window;
		// @ts-expect-error - Testing edge case
		delete global.window;

		expect(() => createClient()).not.toThrow();

		global.window = originalWindow;
	});
});
