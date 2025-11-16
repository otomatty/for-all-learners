/**
 * Tests for useDeleteStudyGoal hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 目標削除成功（goal_deck_linksも削除）
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useDeleteStudyGoal } from "../useDeleteStudyGoal";
import {
	createMockSupabaseClient,
	createWrapper,
	mockStudyGoal,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useDeleteStudyGoal", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 目標削除成功（goal_deck_linksも削除）
	test("TC-001: Should delete study goal successfully (including goal_deck_links)", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock goal_deck_links delete query
		const mockLinksQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		// Mock study_goals delete query
		const mockGoalsQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockLinksQuery) // goal_deck_links
			.mockReturnValueOnce(mockGoalsQuery); // study_goals

		const { result } = renderHook(() => useDeleteStudyGoal(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(mockStudyGoal.id);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		// Verify that goal_deck_links delete was called
		expect(mockLinksQuery.delete).toHaveBeenCalled();
		expect(mockLinksQuery.eq).toHaveBeenCalledWith("goal_id", mockStudyGoal.id);
		// Verify that study_goals delete was called
		expect(mockGoalsQuery.delete).toHaveBeenCalled();
		expect(mockGoalsQuery.eq).toHaveBeenCalledWith("id", mockStudyGoal.id);
		expect(mockGoalsQuery.eq).toHaveBeenCalledWith("user_id", mockUser.id);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should return error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useDeleteStudyGoal(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(mockStudyGoal.id);

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

		// Mock goal_deck_links delete query
		const mockLinksQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		// Mock study_goals delete query with error
		let eqCallCount = 0;
		const mockGoalsQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation(() => {
				eqCallCount++;
				if (eqCallCount === 2) {
					return Promise.resolve({
						data: null,
						error: { message: "Database error", code: "PGRST116" },
					});
				}
				return mockGoalsQuery; // Return this for chaining
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockLinksQuery) // goal_deck_links
			.mockReturnValueOnce(mockGoalsQuery); // study_goals

		const { result } = renderHook(() => useDeleteStudyGoal(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(mockStudyGoal.id);

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
});
