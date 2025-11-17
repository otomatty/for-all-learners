/**
 * Tests for useUpdateStudyGoal hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 目標更新成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - progress_rate が 100 の場合は status を completed に設定
 * - TC-005: エッジケース - deadline が空文字の場合は null にする
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useUpdateStudyGoal } from "../useUpdateStudyGoal";
import {
	createMockSupabaseClient,
	createWrapper,
	mockStudyGoal,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUpdateStudyGoal", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 目標更新成功
	test("TC-001: Should update study goal successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const updatedGoal = {
			...mockStudyGoal,
			title: "Updated Title",
			updated_at: new Date().toISOString(),
		};

		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: updatedGoal,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUpdateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			goalId: mockStudyGoal.id,
			title: "Updated Title",
		};

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		if (result.current.data?.success) {
			expect(result.current.data.data.title).toBe("Updated Title");
		}
		expect(mockQuery.eq).toHaveBeenCalledWith("id", mockStudyGoal.id);
		expect(mockQuery.eq).toHaveBeenCalledWith("user_id", mockUser.id);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should return error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useUpdateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			goalId: mockStudyGoal.id,
			title: "Updated Title",
		};

		result.current.mutate(payload);

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

		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUpdateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			goalId: mockStudyGoal.id,
			title: "Updated Title",
		};

		result.current.mutate(payload);

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

	// TC-004: エッジケース - progress_rate が 100 の場合は status を completed に設定
	test("TC-004: Should set status to completed when progress_rate is 100", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const completedGoal = {
			...mockStudyGoal,
			progress_rate: 100,
			status: "completed" as const,
			completed_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: completedGoal,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUpdateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			goalId: mockStudyGoal.id,
			progressRate: 100,
		};

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		if (result.current.data?.success) {
			expect(result.current.data.data.status).toBe("completed");
			expect(result.current.data.data.progress_rate).toBe(100);
		}
		// Verify that update was called with status: "completed" and completed_at
		expect(mockQuery.update).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "completed",
				progress_rate: 100,
			}),
		);
	});

	// TC-005: エッジケース - deadline が空文字の場合は null にする
	test("TC-005: Should set deadline to null when empty string", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const updatedGoal = {
			...mockStudyGoal,
			deadline: null,
			updated_at: new Date().toISOString(),
		};

		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: updatedGoal,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUpdateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			goalId: mockStudyGoal.id,
			deadline: "", // Empty string
		};

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		if (result.current.data?.success) {
			expect(result.current.data.data.deadline).toBeNull();
		}
		// Verify that update was called with null deadline
		expect(mockQuery.update).toHaveBeenCalledWith(
			expect.objectContaining({
				deadline: null,
			}),
		);
	});
});
