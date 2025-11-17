/**
 * Tests for loginWithGoogleTauri function
 *
 * Test Coverage:
 * - TC-001: 正常系 - Google OAuthログイン成功
 * - TC-002: 異常系 - Tauri環境でない場合のエラー
 * - TC-003: 異常系 - Supabase認証エラー
 * - TC-004: エッジケース - URLが返されない場合
 */

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

describe("loginWithGoogleTauri", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;
	let mockWindowOpen: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);

		// Mock window.open
		mockWindowOpen = vi.fn();
		Object.defineProperty(window, "open", {
			value: mockWindowOpen,
			configurable: true,
			writable: true,
		});
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

		expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
			provider: "google",
			options: {
				redirectTo: "tauri://localhost/auth/callback",
				skipBrowserRedirect: true,
			},
		});
		expect(mockWindowOpen).toHaveBeenCalledWith(mockOAuthUrl, "_blank");
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
			"Google login failed: Network error",
		);
		expect(mockWindowOpen).not.toHaveBeenCalled();
	});

	// TC-004: エッジケース - URLが返されない場合
	test("TC-004: Should not open window when URL is not returned", async () => {
		setupTauriMock();

		mockSupabaseClient.auth.signInWithOAuth = vi.fn().mockResolvedValue({
			data: { url: null },
			error: null,
		});

		await loginWithGoogleTauri();

		expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalled();
		expect(mockWindowOpen).not.toHaveBeenCalled();
	});
});
