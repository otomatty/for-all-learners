/**
 * Tests for useUpdateGoalsPriority hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 優先順位一括更新成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - 空の配列
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useUpdateGoalsPriority } from "../useUpdateGoalsPriority";
import { createMockSupabaseClient, createWrapper, mockUser } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUpdateGoalsPriority", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 優先順位一括更新成功
	test("TC-001: Should update goals priority successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const goalIds = ["goal-1", "goal-2", "goal-3"];

		// Mock update query (called multiple times for each goal)
		// Each goal needs its own query chain
		const mockQueries = goalIds.map(() => {
			let eqCallCount = 0;
			const query = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockImplementation(() => {
					eqCallCount++;
					if (eqCallCount === 2) {
						return Promise.resolve({
							data: null,
							error: null,
						});
					}
					return query; // Return this for chaining
				}),
			};
			return query;
		});

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockQueries[0])
			.mockReturnValueOnce(mockQueries[1])
			.mockReturnValueOnce(mockQueries[2]);

		const { result } = renderHook(() => useUpdateGoalsPriority(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(goalIds);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		// Verify that update was called for each goal
		for (let i = 0; i < goalIds.length; i++) {
			expect(mockQueries[i].update).toHaveBeenCalledWith({
				priority_order: i + 1,
			});
			expect(mockQueries[i].eq).toHaveBeenCalledWith("id", goalIds[i]);
			expect(mockQueries[i].eq).toHaveBeenCalledWith("user_id", mockUser.id);
		}
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should return error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useUpdateGoalsPriority(), {
			wrapper: createWrapper(),
		});

		const goalIds = ["goal-1", "goal-2"];

		result.current.mutate(goalIds);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		if (!result.current.data) {
			throw new Error("Expected data to be defined");
		}
		const data = result.current.data;
		expect(data.success).toBe(false);
		if (!data.success) {
			expect(data.error).toContain("Not authenticated");
		}
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const goalIds = ["goal-1", "goal-2"];

		// Mock update query with error on second goal
		const mockQuery1 = {
			update: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnThis() // First eq() call returns this
				.mockResolvedValueOnce({
					// Second eq() call returns success
					data: null,
					error: null,
				}),
		};

		const mockQuery2 = {
			update: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnThis() // First eq() call returns this
				.mockResolvedValueOnce({
					// Second eq() call returns error
					data: null,
					error: { message: "Database error", code: "PGRST116" },
				}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockQuery1)
			.mockReturnValueOnce(mockQuery2);

		const { result } = renderHook(() => useUpdateGoalsPriority(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(goalIds);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		if (!result.current.data) {
			throw new Error("Expected data to be defined");
		}
		const data = result.current.data;
		expect(data.success).toBe(false);
		if (!data.success) {
			expect(data.error).toBeDefined();
		}
	});

	// TC-004: エッジケース - 空の配列
	test("TC-004: Should handle empty array", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const { result } = renderHook(() => useUpdateGoalsPriority(), {
			wrapper: createWrapper(),
		});

		result.current.mutate([]);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		// No updates should be called for empty array
		expect(mockSupabaseClient.from).not.toHaveBeenCalled();
	});
});
