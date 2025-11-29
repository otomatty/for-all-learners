/**
 * Tests for useCardsByUser hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: エッジケース - 空の結果セット
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { cardsRepository } from "@/lib/repositories/cards-repository";
import { useCardsByUser } from "../useCardsByUser";
import { createWrapper, mockLocalCard } from "./helpers";

// Mock the cards repository
vi.mock("@/lib/repositories/cards-repository", () => ({
	cardsRepository: {
		getAll: vi.fn(),
	},
}));

describe("useCardsByUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch cards by user successfully", async () => {
		const cards = [mockLocalCard];
		const userId = "user-123";

		vi.mocked(cardsRepository.getAll).mockResolvedValue(cards);

		const { result } = renderHook(() => useCardsByUser(userId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(1);
		// useCardsByUserはIDのみを返す
		expect(result.current.data?.[0]).toEqual({ id: mockLocalCard.id });
		expect(cardsRepository.getAll).toHaveBeenCalledWith(userId);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const userId = "user-123";

		vi.mocked(cardsRepository.getAll).mockRejectedValue(
			new Error("Database error"),
		);

		const { result } = renderHook(() => useCardsByUser(userId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: エッジケース - 空の結果セット
	test("TC-003: Should return empty array when no cards exist", async () => {
		const userId = "user-123";

		vi.mocked(cardsRepository.getAll).mockResolvedValue([]);

		const { result } = renderHook(() => useCardsByUser(userId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});
});
