/**
 * Tests for handleTauriAuthCallback function
 *
 * Test Coverage:
 * - TC-001: 正常系 - 認証コールバック処理成功（access_token/refresh_token）
 * - TC-002: 正常系 - 認証コールバック処理成功（code）
 * - TC-003: 異常系 - セッション設定エラー
 * - TC-004: 異常系 - コード交換エラー
 * - TC-005: 異常系 - OAuthエラーパラメータ
 * - TC-006: エッジケース - Web環境では何もしない
 * - TC-007: 異常系 - getUser()エラー
 * - TC-008: 異常系 - 無効なリダイレクトURL
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { handleTauriAuthCallback } from "../tauri-auth-handler";
import {
	cleanupTauriMock,
	createMockSupabaseClient,
	mockSession,
	mockUser,
	setupTauriMock,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");
vi.mock("@/lib/logger", () => ({
	default: {
		error: vi.fn(),
	},
}));

describe("handleTauriAuthCallback", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;
	let mockLocationHref: string;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);

		// Mock window.location.href
		mockLocationHref = "";
		Object.defineProperty(window, "location", {
			value: {
				get href() {
					return mockLocationHref;
				},
				set href(value: string) {
					mockLocationHref = value;
				},
				search: "",
			},
			configurable: true,
			writable: true,
		});
	});

	afterEach(() => {
		cleanupTauriMock();
	});

	// TC-001: 正常系 - 認証コールバック処理成功（access_token/refresh_token）
	test("TC-001: Should handle auth callback with access_token and refresh_token", async () => {
		setupTauriMock();

		// Set URL parameters
		Object.defineProperty(window, "location", {
			value: {
				search: "?access_token=token123&refresh_token=refresh123",
				href: "",
			},
			configurable: true,
		});

		mockSupabaseClient.auth.setSession = vi.fn().mockResolvedValue({
			data: { session: mockSession, user: mockUser },
			error: null,
		});
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		await handleTauriAuthCallback();

		expect(mockSupabaseClient.auth.setSession).toHaveBeenCalledWith({
			access_token: "token123",
			refresh_token: "refresh123",
		});
		expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
		expect(window.location.href).toBe("/dashboard");
	});

	// TC-002: 正常系 - 認証コールバック処理成功（code）
	test("TC-002: Should handle auth callback with code", async () => {
		setupTauriMock();

		// Set URL parameters
		Object.defineProperty(window, "location", {
			value: {
				search: "?code=auth-code-123",
				href: "",
			},
			configurable: true,
		});

		mockSupabaseClient.auth.exchangeCodeForSession = vi.fn().mockResolvedValue({
			data: { session: mockSession, user: mockUser },
			error: null,
		});
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		await handleTauriAuthCallback();

		expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith(
			"auth-code-123",
		);
		expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
		expect(window.location.href).toBe("/dashboard");
	});

	// TC-003: 異常系 - セッション設定エラー
	test("TC-003: Should handle session error", async () => {
		setupTauriMock();

		// Set URL parameters
		Object.defineProperty(window, "location", {
			value: {
				search: "?access_token=token123&refresh_token=refresh123",
				href: "",
			},
			configurable: true,
		});

		const mockError = { message: "Session error" };
		mockSupabaseClient.auth.setSession = vi.fn().mockResolvedValue({
			data: { session: null, user: null },
			error: mockError,
		});

		await handleTauriAuthCallback();

		expect(window.location.href).toBe("/auth/login?error=session_failed");
	});

	// TC-004: 異常系 - コード交換エラー
	test("TC-004: Should handle exchange error", async () => {
		setupTauriMock();

		// Set URL parameters
		Object.defineProperty(window, "location", {
			value: {
				search: "?code=auth-code-123",
				href: "",
			},
			configurable: true,
		});

		const mockError = { message: "Exchange error" };
		mockSupabaseClient.auth.exchangeCodeForSession = vi.fn().mockResolvedValue({
			data: { session: null, user: null },
			error: mockError,
		});

		await handleTauriAuthCallback();

		expect(window.location.href).toBe("/auth/login?error=exchange_failed");
	});

	// TC-005: 異常系 - OAuthエラーパラメータ
	test("TC-005: Should handle OAuth error parameter", async () => {
		setupTauriMock();

		// Set URL parameters
		Object.defineProperty(window, "location", {
			value: {
				search: "?error=access_denied",
				href: "",
			},
			configurable: true,
		});

		await handleTauriAuthCallback();

		expect(window.location.href).toBe("/auth/login?error=access_denied");
		expect(mockSupabaseClient.auth.setSession).not.toHaveBeenCalled();
		expect(
			mockSupabaseClient.auth.exchangeCodeForSession,
		).not.toHaveBeenCalled();
	});

	// TC-006: エッジケース - Web環境では何もしない
	test("TC-006: Should do nothing in web environment", async () => {
		// window.__TAURI__ を設定しない

		await handleTauriAuthCallback();

		expect(mockSupabaseClient.auth.setSession).not.toHaveBeenCalled();
		expect(
			mockSupabaseClient.auth.exchangeCodeForSession,
		).not.toHaveBeenCalled();
	});

	// TC-007: 異常系 - getUser()エラー
	test("TC-007: Should handle getUser error", async () => {
		setupTauriMock();

		// Set URL parameters
		Object.defineProperty(window, "location", {
			value: {
				search: "?access_token=token123&refresh_token=refresh123",
				href: "",
			},
			configurable: true,
		});

		mockSupabaseClient.auth.setSession = vi.fn().mockResolvedValue({
			data: { session: mockSession, user: mockUser },
			error: null,
		});
		const mockGetUserError = { message: "Get user error" };
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: mockGetUserError,
		});

		await handleTauriAuthCallback();

		expect(mockSupabaseClient.auth.setSession).toHaveBeenCalled();
		expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
		expect(window.location.href).toBe("/auth/login?error=get_user_failed");
	});

	// TC-008: 異常系 - 無効なリダイレクトURL
	test("TC-008: Should handle invalid redirect URL", async () => {
		setupTauriMock();

		// Set URL parameters with invalid redirect
		Object.defineProperty(window, "location", {
			value: {
				search: "?redirect_to=http://evil.com",
				href: "",
			},
			configurable: true,
		});

		await handleTauriAuthCallback();

		expect(window.location.href).toBe("/auth/login?error=invalid_redirect");
		expect(mockSupabaseClient.auth.setSession).not.toHaveBeenCalled();
	});

	// TC-009: 正常系 - 有効なリダイレクトURL（tauri://スキーム）
	test("TC-009: Should allow valid tauri:// redirect URL", async () => {
		setupTauriMock();

		// Set URL parameters with valid redirect
		Object.defineProperty(window, "location", {
			value: {
				search: "?redirect_to=tauri://localhost/auth/callback&code=test123",
				href: "",
			},
			configurable: true,
		});

		mockSupabaseClient.auth.exchangeCodeForSession = vi.fn().mockResolvedValue({
			data: { session: mockSession, user: mockUser },
			error: null,
		});
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		await handleTauriAuthCallback();

		expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith(
			"test123",
		);
		expect(window.location.href).toBe("/dashboard");
	});

	// TC-010: 異常系 - 長すぎるエラーメッセージのサニタイズ
	test("TC-010: Should sanitize long error messages", async () => {
		setupTauriMock();

		const longError = "a".repeat(200); // 200文字のエラー
		Object.defineProperty(window, "location", {
			value: {
				search: `?error=${longError}`,
				href: "",
			},
			configurable: true,
		});

		await handleTauriAuthCallback();

		// エラーメッセージが100文字に切り詰められることを確認
		const expectedError = encodeURIComponent(longError.substring(0, 100));
		expect(window.location.href).toContain(`error=${expectedError}`);
	});
});
