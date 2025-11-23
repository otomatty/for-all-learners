/**
 * Tests for usePluginRatings hooks
 *
 * Test Coverage:
 * - TC-001: 正常系 - 評価の送信成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - 無効なレーティング値
 * - TC-004: 正常系 - ユーザーの評価取得
 * - TC-005: 正常系 - 評価が存在しない場合
 * - TC-006: 正常系 - 評価の削除成功
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
	useDeleteRating,
	useGetUserRating,
	useSubmitRating,
} from "../usePluginRatings";
import { createMockSupabaseClient, createWrapper, mockUser } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("usePluginRatings", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	describe("useSubmitRating", () => {
		// TC-001: 正常系 - 評価の送信成功
		test("TC-001: Should submit rating successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockUpsert = vi.fn().mockResolvedValue({
				error: null,
			});
			mockSupabaseClient.from = vi.fn().mockReturnValue({
				upsert: mockUpsert,
			});

			const { result } = renderHook(() => useSubmitRating(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				pluginId: "test-plugin",
				rating: 5,
			});

			expect(mockUpsert).toHaveBeenCalledWith(
				{
					user_id: mockUser.id,
					plugin_id: "test-plugin",
					rating: 5,
				},
				{
					onConflict: "user_id,plugin_id",
				},
			);
		});

		// TC-002: 異常系 - 認証エラー（未認証ユーザー）
		test("TC-002: Should throw error when user is not authenticated", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: null },
				error: new Error("Not authenticated"),
			});

			const { result } = renderHook(() => useSubmitRating(), {
				wrapper: createWrapper(),
			});

			await expect(
				result.current.mutateAsync({
					pluginId: "test-plugin",
					rating: 5,
				}),
			).rejects.toThrow("ユーザーが認証されていません");
		});

		// TC-003: 異常系 - 無効なレーティング値
		test("TC-003: Should throw error for invalid rating", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const { result } = renderHook(() => useSubmitRating(), {
				wrapper: createWrapper(),
			});

			await expect(
				result.current.mutateAsync({
					pluginId: "test-plugin",
					rating: 6, // Invalid: should be 1-5
				}),
			).rejects.toThrow("レーティングは1〜5の整数である必要があります");
		});
	});

	describe("useGetUserRating", () => {
		// TC-004: 正常系 - ユーザーの評価取得
		test("TC-004: Should get user rating successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockRating = {
				id: "rating-1",
				user_id: mockUser.id,
				plugin_id: "test-plugin",
				rating: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
			};

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockRating,
					error: null,
				}),
			};

			mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

			const { result } = renderHook(() => useGetUserRating("test-plugin"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual({
				id: "rating-1",
				userId: mockUser.id,
				pluginId: "test-plugin",
				rating: 5,
				createdAt: new Date("2025-01-01T00:00:00Z"),
				updatedAt: new Date("2025-01-01T00:00:00Z"),
			});
		});

		// TC-005: 正常系 - 評価が存在しない場合
		test("TC-005: Should return null when rating does not exist", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { code: "PGRST116" }, // No rows found
				}),
			};

			mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

			const { result } = renderHook(() => useGetUserRating("test-plugin"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toBeNull();
		});
	});

	describe("useDeleteRating", () => {
		// TC-006: 正常系 - 評価の削除成功
		test("TC-006: Should delete rating successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockEq1 = vi.fn().mockReturnThis();
			const mockEq2 = vi.fn().mockResolvedValue({
				error: null,
			});
			const mockDelete = vi.fn().mockReturnValue({
				eq: mockEq1,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				delete: mockDelete,
			});
			mockEq1.mockReturnValue({
				eq: mockEq2,
			});

			const { result } = renderHook(() => useDeleteRating(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync("test-plugin");

			expect(mockEq1).toHaveBeenCalledWith("user_id", mockUser.id);
			expect(mockEq2).toHaveBeenCalledWith("plugin_id", "test-plugin");
		});
	});
});
