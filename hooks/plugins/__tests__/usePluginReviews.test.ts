/**
 * Tests for usePluginReviews hooks
 *
 * Test Coverage:
 * - TC-001: 正常系 - レビューの送信成功（新規作成）
 * - TC-002: 正常系 - レビューの送信成功（更新）
 * - TC-003: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-004: 異常系 - 無効なレビュー内容
 * - TC-005: 正常系 - プラグインのレビュー取得
 * - TC-006: 正常系 - ユーザーのレビュー取得
 * - TC-007: 正常系 - レビューの削除成功
 * - TC-008: 正常系 - 役立った投票のトグル
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
	useDeleteReview,
	useGetUserReview,
	usePluginReviews,
	useSubmitReview,
	useToggleHelpful,
} from "../usePluginReviews";
import { createMockSupabaseClient, createWrapper, mockUser } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("usePluginReviews", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	describe("useSubmitReview", () => {
		// TC-001: 正常系 - レビューの送信成功（新規作成）
		test("TC-001: Should submit new review successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			// Mock existing review check (should return null - not reviewed)
			const mockExistingQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { code: "PGRST116" },
				}),
			};

			// Mock insert query
			const mockInsertQuery = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { id: "review-123" },
					error: null,
				}),
			};

			mockSupabaseClient.from = vi
				.fn()
				.mockReturnValueOnce(mockExistingQuery)
				.mockReturnValueOnce(mockInsertQuery);

			const { result } = renderHook(() => useSubmitReview(), {
				wrapper: createWrapper(),
			});

			const response = await result.current.mutateAsync({
				pluginId: "test-plugin",
				content: "Great plugin!",
				title: "Review Title",
			});

			expect(response.reviewId).toBe("review-123");
			expect(mockInsertQuery.insert).toHaveBeenCalled();
		});

		// TC-002: 正常系 - レビューの送信成功（更新）
		test("TC-002: Should update existing review successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			// Mock existing review check
			const mockExistingQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { id: "review-123" },
					error: null,
				}),
			};

			// Mock update query
			const mockUpdateQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { id: "review-123" },
					error: null,
				}),
			};

			mockSupabaseClient.from = vi
				.fn()
				.mockReturnValueOnce(mockExistingQuery)
				.mockReturnValueOnce(mockUpdateQuery);

			const { result } = renderHook(() => useSubmitReview(), {
				wrapper: createWrapper(),
			});

			const response = await result.current.mutateAsync({
				pluginId: "test-plugin",
				content: "Updated review content",
			});

			expect(response.reviewId).toBe("review-123");
			expect(mockUpdateQuery.update).toHaveBeenCalled();
		});

		// TC-003: 異常系 - 認証エラー（未認証ユーザー）
		test("TC-003: Should throw error when user is not authenticated", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: null },
				error: new Error("Not authenticated"),
			});

			const { result } = renderHook(() => useSubmitReview(), {
				wrapper: createWrapper(),
			});

			await expect(
				result.current.mutateAsync({
					pluginId: "test-plugin",
					content: "Review content",
				}),
			).rejects.toThrow("ユーザーが認証されていません");
		});

		// TC-004: 異常系 - 無効なレビュー内容
		test("TC-004: Should throw error for invalid review content", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const { result } = renderHook(() => useSubmitReview(), {
				wrapper: createWrapper(),
			});

			await expect(
				result.current.mutateAsync({
					pluginId: "test-plugin",
					content: "", // Empty content
				}),
			).rejects.toThrow("レビュー内容を入力してください");
		});
	});

	describe("usePluginReviews", () => {
		// TC-005: 正常系 - プラグインのレビュー取得
		test("TC-005: Should get plugin reviews successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockReview = {
				id: "review-1",
				user_id: mockUser.id,
				plugin_id: "test-plugin",
				title: "Review Title",
				content: "Review content",
				helpful_count: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
				accounts: {
					id: mockUser.id,
					full_name: "Test User",
					email: "test@example.com",
				},
			};

			const mockHelpfulVotes = {
				data: [{ review_id: "review-1" }],
				error: null,
			};

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({
					data: [mockReview],
					error: null,
					count: 1,
				}),
			};

			mockSupabaseClient.from = vi
				.fn()
				.mockReturnValueOnce(mockQuery)
				.mockReturnValueOnce({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					in: vi.fn().mockResolvedValue(mockHelpfulVotes),
				});

			const { result } = renderHook(
				() => usePluginReviews("test-plugin", { limit: 10, offset: 0 }),
				{
					wrapper: createWrapper(),
				},
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.reviews).toHaveLength(1);
			expect(result.current.data?.total).toBe(1);
		});
	});

	describe("useGetUserReview", () => {
		// TC-006: 正常系 - ユーザーのレビュー取得
		test("TC-006: Should get user review successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockReview = {
				id: "review-1",
				user_id: mockUser.id,
				plugin_id: "test-plugin",
				title: "Review Title",
				content: "Review content",
				helpful_count: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
			};

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockReview,
					error: null,
				}),
			};

			mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

			const { result } = renderHook(() => useGetUserReview("test-plugin"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual({
				id: "review-1",
				userId: mockUser.id,
				pluginId: "test-plugin",
				title: "Review Title",
				content: "Review content",
				helpfulCount: 5,
				createdAt: new Date("2025-01-01T00:00:00Z"),
				updatedAt: new Date("2025-01-01T00:00:00Z"),
			});
		});
	});

	describe("useDeleteReview", () => {
		// TC-007: 正常系 - レビューの削除成功
		test("TC-007: Should delete review successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			// Mock ownership check
			const mockOwnershipQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: {
						user_id: mockUser.id,
						plugin_id: "test-plugin",
					},
					error: null,
				}),
			};

			// Mock delete query
			const mockDeleteQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({
					error: null,
				}),
			};

			mockSupabaseClient.from = vi
				.fn()
				.mockReturnValueOnce(mockOwnershipQuery)
				.mockReturnValueOnce(mockDeleteQuery);

			const { result } = renderHook(() => useDeleteReview(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync("review-123");

			expect(mockDeleteQuery.delete).toHaveBeenCalled();
		});
	});

	describe("useToggleHelpful", () => {
		// TC-008: 正常系 - 役立った投票のトグル
		test("TC-008: Should toggle helpful vote successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
				data: true, // Vote was added
				error: null,
			});

			const { result } = renderHook(() => useToggleHelpful(), {
				wrapper: createWrapper(),
			});

			const isHelpful = await result.current.mutateAsync("review-123");

			expect(isHelpful).toBe(true);
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
				"toggle_review_helpful",
				{
					p_review_id: "review-123",
				},
			);
		});
	});
});
