/**
 * Tests for useMilestones hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: エッジケース - 空の結果セット
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useMilestones } from "../useMilestones";
import {
	createMockSupabaseClient,
	createWrapper,
	mockMilestone,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useMilestones", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch milestones successfully", async () => {
		const milestones = [mockMilestone];

		let orderCallCount = 0;
		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: milestones,
						error: null,
					});
				}
				return mockQuery; // Return this for chaining
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useMilestones(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(1);
		expect(result.current.data?.[0]?.id).toBe(mockMilestone.id);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		let orderCallCount = 0;
		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: null,
						error: { message: "Database error", code: "PGRST116" },
					});
				}
				return mockQuery; // Return this for chaining
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useMilestones(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Should return empty array on error
		expect(result.current.data).toEqual([]);
	});

	// TC-003: エッジケース - 空の結果セット
	test("TC-003: Should return empty array when no milestones exist", async () => {
		let orderCallCount = 0;
		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockImplementation(() => {
				orderCallCount++;
				if (orderCallCount === 2) {
					return Promise.resolve({
						data: [],
						error: null,
					});
				}
				return mockQuery; // Return this for chaining
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useMilestones(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});
});
