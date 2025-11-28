/**
 * Tests for useGoalLimits hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 無料ユーザーの制限情報取得成功
 * - TC-002: 正常系 - 有料ユーザーの制限情報取得成功
 * - TC-003: 異常系 - データベースエラー（フォールバック動作）
 * - TC-004: エッジケース - 空のuserIdの場合は無料プランとして扱う
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useGoalLimits } from "../useGoalLimits";
import {
	createMockSupabaseClient,
	createWrapper,
	mockStudyGoal,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useGoalLimits", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 無料ユーザーの制限情報取得成功
	test("TC-001: Should fetch goal limits for free user successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock goals query (2 goals)
		let orderCallCount = 0;
		const mockGoalsQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: [mockStudyGoal, { ...mockStudyGoal, id: "goal-456" }],
						error: null,
					});
				}
				return mockGoalsQuery; // Return this for chaining
			}),
		};

		// Mock subscriptions query (free user)
		const mockSubscriptionsQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({
				data: { plan_id: "free" },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockGoalsQuery) // study_goals table
			.mockReturnValueOnce(mockSubscriptionsQuery); // subscriptions table

		const { result } = renderHook(() => useGoalLimits(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		if (result.current.data) {
			expect(result.current.data.currentCount).toBe(2);
			expect(result.current.data.maxGoals).toBe(3);
			expect(result.current.data.canAddMore).toBe(true);
			expect(result.current.data.isPaid).toBe(false);
			expect(result.current.data.remainingGoals).toBe(1);
		}
	});

	// TC-002: 正常系 - 有料ユーザーの制限情報取得成功
	test("TC-002: Should fetch goal limits for paid user successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock goals query (5 goals)
		let orderCallCount = 0;
		const mockGoalsQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: Array.from({ length: 5 }, (_, i) => ({
							...mockStudyGoal,
							id: `goal-${i}`,
						})),
						error: null,
					});
				}
				return mockGoalsQuery; // Return this for chaining
			}),
		};

		// Mock subscriptions query (paid user)
		const mockSubscriptionsQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({
				data: { plan_id: "premium" },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockGoalsQuery) // study_goals table
			.mockReturnValueOnce(mockSubscriptionsQuery); // subscriptions table

		const { result } = renderHook(() => useGoalLimits(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		if (result.current.data) {
			expect(result.current.data.currentCount).toBe(5);
			expect(result.current.data.maxGoals).toBe(10);
			expect(result.current.data.canAddMore).toBe(true);
			expect(result.current.data.isPaid).toBe(true);
			expect(result.current.data.remainingGoals).toBe(5);
		}
	});

	// TC-003: 異常系 - データベースエラー（エラーをthrow）
	test("TC-003: Should handle database error by throwing", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock goals query to return error
		let orderCallCount = 0;
		const mockGoalsQueryError = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: null,
						error: { message: "Database error", code: "PGRST116" },
					});
				}
				return mockGoalsQueryError; // Return this for chaining
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockGoalsQueryError);

		const { result } = renderHook(() => useGoalLimits(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("Database error");
	});

	// TC-004: エッジケース - 空のuserIdの場合は無料プランとして扱う
	test("TC-004: Should treat empty userId as free plan", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const { result } = renderHook(() => useGoalLimits(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		// Should return free plan defaults
		if (result.current.data) {
			expect(result.current.data.currentCount).toBe(0);
			expect(result.current.data.maxGoals).toBe(3);
			expect(result.current.data.canAddMore).toBe(true);
			expect(result.current.data.isPaid).toBe(false);
			expect(result.current.data.remainingGoals).toBe(3);
		}
	});
});
