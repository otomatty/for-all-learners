/**
 * Tests for loginWithGoogleTauri function
 *
 * Test Coverage:
 * - TC-001: 正常系 - Google OAuthログイン成功
 * - TC-002: 異常系 - Tauri環境でない場合のエラー
 * - TC-003: 異常系 - Supabase認証エラー
 * - TC-004: エッジケース - URLが返されない場合
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { loginWithGoogleTauri } from "../tauri-login";
import {
	cleanupTauriMock,
	createMockSupabaseClient,
	setupTauriMock,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
	listen: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
	open: vi.fn(),
}));

describe("loginWithGoogleTauri", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;
	let mockInvoke: ReturnType<typeof vi.fn>;
	let mockListen: ReturnType<typeof vi.fn>;
	let mockOpen: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);

		// Mock Tauri API functions
		mockInvoke = vi.mocked(invoke);
		mockListen = vi.mocked(listen);
		mockOpen = vi.mocked(open);

		// Setup default mocks
		mockInvoke.mockResolvedValue(8080); // Default port
		mockListen.mockResolvedValue(vi.fn()); // Return unlisten function
		mockOpen.mockResolvedValue(undefined);
	});

	afterEach(() => {
		cleanupTauriMock();
	});

	// TC-001: 正常系 - Google OAuthログイン成功
	test("TC-001: Should initiate Google OAuth login successfully", async () => {
		setupTauriMock();

		const mockOAuthUrl =
			"https://supabase.co/auth/v1/authorize?provider=google";
		mockSupabaseClient.auth.signInWithOAuth = vi.fn().mockResolvedValue({
			data: { url: mockOAuthUrl },
			error: null,
		});

		await loginWithGoogleTauri();

		expect(mockInvoke).toHaveBeenCalledWith("start_oauth_server");
		expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
			provider: "google",
			options: {
				redirectTo: "http://localhost:8080",
				skipBrowserRedirect: true,
			},
		});
		expect(mockOpen).toHaveBeenCalledWith(mockOAuthUrl);
	});

	// TC-002: 異常系 - Tauri環境でない場合のエラー
	test("TC-002: Should throw error when not in Tauri environment", async () => {
		// window.__TAURI__ を設定しない

		await expect(loginWithGoogleTauri()).rejects.toThrow(
			"This function is only available in Tauri environment",
		);
		expect(mockSupabaseClient.auth.signInWithOAuth).not.toHaveBeenCalled();
	});

	// TC-003: 異常系 - Supabase認証エラー
	test("TC-003: Should throw error when Supabase auth fails", async () => {
		setupTauriMock();

		const mockError = { message: "Network error" };
		mockSupabaseClient.auth.signInWithOAuth = vi.fn().mockResolvedValue({
			data: { url: null },
			error: mockError,
		});

		await expect(loginWithGoogleTauri()).rejects.toThrow(
			"Google認証の開始に失敗しました: Network error",
		);
		expect(mockOpen).not.toHaveBeenCalled();
	});

	// TC-004: エッジケース - URLが返されない場合
	test("TC-004: Should not open window when URL is not returned", async () => {
		setupTauriMock();

		mockSupabaseClient.auth.signInWithOAuth = vi.fn().mockResolvedValue({
			data: { url: null },
			error: null,
		});

		await expect(loginWithGoogleTauri()).rejects.toThrow(
			"認証URLの取得に失敗しました",
		);

		expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalled();
		expect(mockOpen).not.toHaveBeenCalled();
	});
});
