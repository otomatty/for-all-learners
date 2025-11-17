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

		// Mock RPC function to return success
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: true,
			error: null,
		});

		const { result } = renderHook(() => useUpdateGoalsPriority(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(goalIds);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Verify that RPC function was called
		expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
			"update_goals_priority",
			{
				p_user_id: mockUser.id,
				p_goal_ids: goalIds,
			},
		);
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
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("Not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const goalIds = ["goal-1", "goal-2"];

		// Mock RPC function to return error
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: "Database error", code: "PGRST116" },
		});

		const { result } = renderHook(() => useUpdateGoalsPriority(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(goalIds);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("Database error");
	});

	// TC-004: エッジケース - 空の配列
	test("TC-004: Should handle empty array", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock RPC function to return success for empty array
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: true,
			error: null,
		});

		const { result } = renderHook(() => useUpdateGoalsPriority(), {
			wrapper: createWrapper(),
		});

		result.current.mutate([]);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Verify that RPC function was called with empty array
		expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
			"update_goals_priority",
			{
				p_user_id: mockUser.id,
				p_goal_ids: [],
			},
		);
	});
});
