/**
 * Tests for useAuth hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - セッション取得成功
 * - TC-002: 正常系 - 未認証状態
 * - TC-003: 正常系 - 認証状態変更のリッスン
 * - TC-004: 異常系 - セッション取得エラー
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { createWrapper } from "../../../hooks/notes/__tests__/helpers";
import {
	createMockSupabaseClient,
	mockSession,
	mockUser,
} from "../../auth/__tests__/helpers";
import { useAuth } from "../use-auth";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useAuth", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;
	let mockUnsubscribe: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);

		mockUnsubscribe = vi.fn();
		mockSupabaseClient.auth.onAuthStateChange = vi.fn().mockReturnValue({
			data: { subscription: { unsubscribe: mockUnsubscribe } },
		});
	});

	// TC-001: 正常系 - セッション取得成功
	test("TC-001: Should return user when session exists", async () => {
		mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
			data: { session: mockSession },
			error: null,
		});

		const { result } = renderHook(() => useAuth(), {
			wrapper: createWrapper(),
		});

		expect(result.current.loading).toBe(true);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.user).toEqual(mockUser);
		expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
		expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled();
	});

	// TC-002: 正常系 - 未認証状態
	test("TC-002: Should return null user when no session", async () => {
		mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
			data: { session: null },
			error: null,
		});

		const { result } = renderHook(() => useAuth(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.user).toBeNull();
		expect(result.current.loading).toBe(false);
	});

	// TC-003: 正常系 - 認証状態変更のリッスン
	test("TC-003: Should listen to auth state changes", async () => {
		mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
			data: { session: null },
			error: null,
		});

		const { unmount } = renderHook(() => useAuth(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled();
		});

		unmount();

		expect(mockUnsubscribe).toHaveBeenCalled();
	});

	// TC-004: 異常系 - セッション取得エラー
	test("TC-004: Should handle session fetch error", async () => {
		mockSupabaseClient.auth.getSession = vi
			.fn()
			.mockRejectedValue(new Error("Network error"));

		const { result } = renderHook(() => useAuth(), {
			wrapper: createWrapper(),
		});

		// エラーが発生しても、loadingはfalseになる
		await waitFor(
			() => {
				expect(result.current.loading).toBe(false);
			},
			{ timeout: 3000 },
		);

		expect(result.current.user).toBeNull();
	});
});
