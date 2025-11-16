/**
 * Tests for useReviewCard hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - カード復習成功（FSRS計算含む）
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - カードが見つからない
 * - TC-004: 異常系 - データベースエラー（カード更新）
 * - TC-005: 異常系 - データベースエラー（学習ログ作成）
 * - TC-006: エッジケース - 初回レビュー（last_reviewed_at が null）
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useReviewCard } from "../useReviewCard";
import {
	createMockSupabaseClient,
	createWrapper,
	mockCard,
	mockLearningLog,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");
// Mock FSRS calculation
vi.mock("@/lib/utils/fsrs", () => ({
	calculateFSRS: vi.fn(
		(prevStability, prevDifficulty, _elapsedDays, _qualityy) => {
			return {
				stability: prevStability * 1.5,
				difficulty: prevDifficulty + 0.1,
				intervalDays: 2.0,
			};
		},
	),
}));

describe("useReviewCard", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - カード復習成功（FSRS計算含む）
	test("TC-001: Should review card successfully with FSRS calculation", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock card fetch query
		const mockCardQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockCard,
				error: null,
			}),
		};

		// Mock card update query
		const updatedCard = {
			...mockCard,
			review_interval: 2,
			stability: 1.5,
			difficulty: 0.4,
			last_reviewed_at: new Date().toISOString(),
			next_review_at: new Date(
				Date.now() + 2 * 24 * 60 * 60 * 1000,
			).toISOString(),
		};
		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: updatedCard,
				error: null,
			}),
		};

		// Mock learning log insert query
		const mockLogQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockLearningLog,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockCardQuery) // cards select
			.mockReturnValueOnce(mockUpdateQuery) // cards update
			.mockReturnValueOnce(mockLogQuery); // learning_logs insert

		const { result } = renderHook(() => useReviewCard(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			cardId: mockCard.id,
			quality: 3,
			practiceMode: "review",
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		if (result.current.data) {
			expect(result.current.data.interval).toBe(2);
			expect(result.current.data.nextReviewAt).toBeDefined();
			expect(result.current.data.log).toBeDefined();
		}
		// Verify that card was updated
		expect(mockUpdateQuery.update).toHaveBeenCalled();
		// Verify that learning log was created
		expect(mockLogQuery.insert).toHaveBeenCalled();
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useReviewCard(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			cardId: mockCard.id,
			quality: 3,
			practiceMode: "review",
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - カードが見つからない
	test("TC-003: Should throw error when card is not found", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockCardQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Card not found", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockCardQuery);

		const { result } = renderHook(() => useReviewCard(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			cardId: mockCard.id,
			quality: 3,
			practiceMode: "review",
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("Card not found");
	});

	// TC-004: 異常系 - データベースエラー（カード更新）
	test("TC-004: Should handle database error on card update", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockCardQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockCard,
				error: null,
			}),
		};

		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockCardQuery) // cards select
			.mockReturnValueOnce(mockUpdateQuery); // cards update

		const { result } = renderHook(() => useReviewCard(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			cardId: mockCard.id,
			quality: 3,
			practiceMode: "review",
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-005: 異常系 - データベースエラー（学習ログ作成）
	test("TC-005: Should handle database error on learning log creation", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockCardQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockCard,
				error: null,
			}),
		};

		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		const mockLogQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockCardQuery) // cards select
			.mockReturnValueOnce(mockUpdateQuery) // cards update
			.mockReturnValueOnce(mockLogQuery); // learning_logs insert

		const { result } = renderHook(() => useReviewCard(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			cardId: mockCard.id,
			quality: 3,
			practiceMode: "review",
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-006: エッジケース - 初回レビュー（last_reviewed_at が null）
	test("TC-006: Should handle first review (last_reviewed_at is null)", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const cardWithoutReview = {
			...mockCard,
			last_reviewed_at: null,
		};

		const mockCardQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: cardWithoutReview,
				error: null,
			}),
		};

		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		const mockLogQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockLearningLog,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockCardQuery) // cards select
			.mockReturnValueOnce(mockUpdateQuery) // cards update
			.mockReturnValueOnce(mockLogQuery); // learning_logs insert

		const { result } = renderHook(() => useReviewCard(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			cardId: cardWithoutReview.id,
			quality: 3,
			practiceMode: "review",
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		// elapsedDays should be 0 for first review
		const { calculateFSRS } = await import("@/lib/utils/fsrs");
		expect(calculateFSRS).toHaveBeenCalledWith(
			cardWithoutReview.stability,
			cardWithoutReview.difficulty,
			0, // elapsedDays should be 0
			3, // quality
		);
	});
});
