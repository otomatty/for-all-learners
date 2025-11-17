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
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

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
		const nextReviewAt = new Date(
			Date.now() + 2 * 24 * 60 * 60 * 1000,
		).toISOString();

		// Mock RPC function response
		const mockRpcResponse = {
			interval: 2,
			nextReviewAt,
			log: mockLearningLog,
		};

		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: mockRpcResponse,
			error: null,
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
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		if (result.current.data) {
			expect(result.current.data.interval).toBe(2);
			expect(result.current.data.nextReviewAt).toBe(nextReviewAt);
			expect(result.current.data.log).toBeDefined();
		}
		// Verify that RPC function was called
		expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("review_card", {
			p_card_id: mockCard.id,
			p_quality: 3,
			p_practice_mode: "review",
		});
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		// Mock RPC function to return authentication error
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: "Not authenticated", code: "PGRST301" },
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
		expect(result.current.error?.message).toContain("Not authenticated");
	});

	// TC-003: 異常系 - カードが見つからない
	test("TC-003: Should throw error when card is not found", async () => {
		// Mock RPC function to return error
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: "Card with id card-123 not found", code: "P0001" },
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
		expect(result.current.error?.message).toContain("Card with id");
	});

	// TC-004: 異常系 - データベースエラー（カード更新）
	test("TC-004: Should handle database error on card update", async () => {
		// Mock RPC function to return error
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: "Database error", code: "PGRST116" },
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
		expect(result.current.error?.message).toContain("Database error");
	});

	// TC-005: 異常系 - データベースエラー（学習ログ作成）
	test("TC-005: Should handle database error on learning log creation", async () => {
		// Mock RPC function to return error
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: "Failed to create learning log", code: "PGRST116" },
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
		expect(result.current.error?.message).toContain(
			"Failed to create learning log",
		);
	});

	// TC-006: エッジケース - 初回レビュー（last_reviewed_at が null）
	test("TC-006: Should handle first review (last_reviewed_at is null)", async () => {
		const nextReviewAt = new Date(
			Date.now() + 2 * 24 * 60 * 60 * 1000,
		).toISOString();

		// Mock RPC function response for first review
		const mockRpcResponse = {
			interval: 2,
			nextReviewAt,
			log: mockLearningLog,
		};

		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: mockRpcResponse,
			error: null,
		});

		const { result } = renderHook(() => useReviewCard(), {
			wrapper: createWrapper(),
		});

		const cardWithoutReview = {
			...mockCard,
			last_reviewed_at: null,
		};

		result.current.mutate({
			cardId: cardWithoutReview.id,
			quality: 3,
			practiceMode: "review",
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		if (result.current.data) {
			expect(result.current.data.interval).toBe(2);
			expect(result.current.data.nextReviewAt).toBe(nextReviewAt);
			expect(result.current.data.log).toBeDefined();
		}
		// Verify that RPC function was called
		expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("review_card", {
			p_card_id: cardWithoutReview.id,
			p_quality: 3,
			p_practice_mode: "review",
		});
	});
});
