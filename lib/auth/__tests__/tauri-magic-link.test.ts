/**
 * Tests for loginWithMagicLinkTauri function
 *
 * Test Coverage:
 * - TC-001: 正常系 - Magic Link送信成功
 * - TC-002: 異常系 - Supabase認証エラー
 * - TC-003: エッジケース - 空のメールアドレス
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { loginWithMagicLinkTauri } from "../tauri-magic-link";
import { createMockSupabaseClient } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("loginWithMagicLinkTauri", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - Magic Link送信成功
	test("TC-001: Should send Magic Link email successfully", async () => {
		const email = "test@example.com";
		mockSupabaseClient.auth.signInWithOtp = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		const result = await loginWithMagicLinkTauri(email);

		expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
			email,
			options: {
				emailRedirectTo: "tauri://localhost/auth/callback",
			},
		});
		expect(result).toEqual({
			success: true,
			message: "認証メールを送信しました",
		});
	});

	// TC-002: 異常系 - Supabase認証エラー
	test("TC-002: Should throw error when Supabase auth fails", async () => {
		const email = "test@example.com";
		const mockError = { message: "Invalid email" };
		mockSupabaseClient.auth.signInWithOtp = vi.fn().mockResolvedValue({
			data: {},
			error: mockError,
		});

		await expect(loginWithMagicLinkTauri(email)).rejects.toThrow(
			"Magic Link login failed: Invalid email",
		);
	});

	// TC-003: エッジケース - 空のメールアドレス
	test("TC-003: Should handle empty email address", async () => {
		const email = "";
		mockSupabaseClient.auth.signInWithOtp = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		const result = await loginWithMagicLinkTauri(email);

		expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
			email: "",
			options: {
				emailRedirectTo: "tauri://localhost/auth/callback",
			},
		});
		expect(result.success).toBe(true);
	});
});
