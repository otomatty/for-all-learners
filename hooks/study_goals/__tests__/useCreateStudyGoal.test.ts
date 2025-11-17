/**
 * Tests for useCreateStudyGoal hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 目標作成成功（無料ユーザー、制限内）
 * - TC-002: 正常系 - 目標作成成功（有料ユーザー、制限内）
 * - TC-003: 異常系 - 制限超過エラー（無料ユーザー、3個以上）
 * - TC-004: 異常系 - 制限超過エラー（有料ユーザー、10個以上）
 * - TC-005: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-006: 異常系 - データベースエラー
 * - TC-007: エッジケース - deadline が空文字の場合は null にする
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useCreateStudyGoal } from "../useCreateStudyGoal";
import {
	createMockSupabaseClient,
	createWrapper,
	mockStudyGoal,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");
// Mock subscriptions actions
vi.mock("@/app/_actions/subscriptions", () => ({
	isUserPaid: vi.fn(),
}));

describe("useCreateStudyGoal", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 目標作成成功（無料ユーザー、制限内）
	test("TC-001: Should create study goal successfully (free user, within limit)", async () => {
		const { isUserPaid } = await import("@/app/_actions/subscriptions");
		vi.mocked(isUserPaid).mockResolvedValue(false);

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock existing goals query (2 goals, within limit of 3)
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

		// Mock count query for priority_order
		const mockCountQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
				count: 2,
			}),
		};

		// Mock insert query
		const newGoal = { ...mockStudyGoal, id: "new-goal-123", priority_order: 3 };
		const mockInsertQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: newGoal,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockGoalsQuery) // getStudyGoalsByUser
			.mockReturnValueOnce(mockCountQuery) // count for priority_order
			.mockReturnValueOnce(mockInsertQuery); // insert

		const { result } = renderHook(() => useCreateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			title: "New Goal",
			description: "New description",
			deadline: "2025-12-31T00:00:00Z",
		};

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		if (result.current.data?.success) {
			expect(result.current.data.data.id).toBe(newGoal.id);
		}
	});

	// TC-002: 正常系 - 目標作成成功（有料ユーザー、制限内）
	test("TC-002: Should create study goal successfully (paid user, within limit)", async () => {
		const { isUserPaid } = await import("@/app/_actions/subscriptions");
		vi.mocked(isUserPaid).mockResolvedValue(true);

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock existing goals query (5 goals, within limit of 10)
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

		// Mock count query for priority_order
		const mockCountQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
				count: 5,
			}),
		};

		// Mock insert query
		const newGoal = { ...mockStudyGoal, id: "new-goal-123", priority_order: 6 };
		const mockInsertQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: newGoal,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockGoalsQuery) // getStudyGoalsByUser
			.mockReturnValueOnce(mockCountQuery) // count for priority_order
			.mockReturnValueOnce(mockInsertQuery); // insert

		const { result } = renderHook(() => useCreateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			title: "New Goal",
			description: "New description",
			deadline: "2025-12-31T00:00:00Z",
		};

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
	});

	// TC-003: 異常系 - 制限超過エラー（無料ユーザー、3個以上）
	test("TC-003: Should return error when free user exceeds limit (3 goals)", async () => {
		const { isUserPaid } = await import("@/app/_actions/subscriptions");
		vi.mocked(isUserPaid).mockResolvedValue(false);

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock existing goals query (3 goals, at limit)
		let orderCallCount = 0;
		const mockGoalsQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: Array.from({ length: 3 }, (_, i) => ({
							...mockStudyGoal,
							id: `goal-${i}`,
						})),
						error: null,
					});
				}
				return mockGoalsQuery; // Return this for chaining
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockGoalsQuery);

		const { result } = renderHook(() => useCreateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			title: "New Goal",
			description: "New description",
			deadline: "2025-12-31T00:00:00Z",
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
			expect(data.error).toContain("最大3個");
		}
	});

	// TC-004: 異常系 - 制限超過エラー（有料ユーザー、10個以上）
	test("TC-004: Should return error when paid user exceeds limit (10 goals)", async () => {
		const { isUserPaid } = await import("@/app/_actions/subscriptions");
		vi.mocked(isUserPaid).mockResolvedValue(true);

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock existing goals query (10 goals, at limit)
		let orderCallCount = 0;
		const mockGoalsQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: Array.from({ length: 10 }, (_, i) => ({
							...mockStudyGoal,
							id: `goal-${i}`,
						})),
						error: null,
					});
				}
				return mockGoalsQuery; // Return this for chaining
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockGoalsQuery);

		const { result } = renderHook(() => useCreateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			title: "New Goal",
			description: "New description",
			deadline: "2025-12-31T00:00:00Z",
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
			expect(data.error).toContain("最大10個");
		}
	});

	// TC-005: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-005: Should return error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useCreateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			title: "New Goal",
			description: "New description",
			deadline: "2025-12-31T00:00:00Z",
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

	// TC-006: 異常系 - データベースエラー
	test("TC-006: Should handle database error", async () => {
		const { isUserPaid } = await import("@/app/_actions/subscriptions");
		vi.mocked(isUserPaid).mockResolvedValue(false);

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock existing goals query
		let orderCallCount = 0;
		const mockGoalsQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: [],
						error: null,
					});
				}
				return mockGoalsQuery; // Return this for chaining
			}),
		};

		// Mock count query for priority_order
		const mockCountQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
				count: 0,
			}),
		};

		// Mock insert query with error
		const mockInsertQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "23505" },
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockGoalsQuery) // getStudyGoalsByUser
			.mockReturnValueOnce(mockCountQuery) // count for priority_order
			.mockReturnValueOnce(mockInsertQuery); // insert

		const { result } = renderHook(() => useCreateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			title: "New Goal",
			description: "New description",
			deadline: "2025-12-31T00:00:00Z",
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

	// TC-007: エッジケース - deadline が空文字の場合は null にする
	test("TC-007: Should set deadline to null when empty string", async () => {
		const { isUserPaid } = await import("@/app/_actions/subscriptions");
		vi.mocked(isUserPaid).mockResolvedValue(false);

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock existing goals query
		let orderCallCount = 0;
		const mockGoalsQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: [],
						error: null,
					});
				}
				return mockGoalsQuery; // Return this for chaining
			}),
		};

		// Mock count query for priority_order
		const mockCountQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
				count: 0,
			}),
		};

		// Mock insert query
		const newGoal = {
			...mockStudyGoal,
			id: "new-goal-123",
			deadline: null,
			priority_order: 1,
		};
		const mockInsertQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: newGoal,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockGoalsQuery) // getStudyGoalsByUser
			.mockReturnValueOnce(mockCountQuery) // count for priority_order
			.mockReturnValueOnce(mockInsertQuery); // insert

		const { result } = renderHook(() => useCreateStudyGoal(), {
			wrapper: createWrapper(),
		});

		const payload = {
			title: "New Goal",
			description: "New description",
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
		// Verify that insert was called with null deadline
		expect(mockInsertQuery.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				deadline: null,
			}),
		);
	});
});
