/**
 * Tests for useDueCardsByDeck hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 期限切れカード取得成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: エッジケース - 空の結果セット
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { cardsRepository } from "@/lib/repositories/cards-repository";
import { useDueCardsByDeck } from "../useDueCardsByDeck";
import { createWrapper, mockLocalCard } from "./helpers";

// Mock the cards repository
vi.mock("@/lib/repositories/cards-repository", () => ({
	cardsRepository: {
		getDueCardsByDeck: vi.fn(),
	},
}));

describe("useDueCardsByDeck", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - 期限切れカード取得成功
	test("TC-001: Should fetch due cards by deck successfully", async () => {
		const cards = [mockLocalCard];
		const deckId = "deck-123";
		const userId = "user-123";

		vi.mocked(cardsRepository.getDueCardsByDeck).mockResolvedValue(cards);

		const { result } = renderHook(() => useDueCardsByDeck(deckId, userId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(1);
		expect(cardsRepository.getDueCardsByDeck).toHaveBeenCalledWith(
			deckId,
			userId,
		);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const deckId = "deck-123";
		const userId = "user-123";

		vi.mocked(cardsRepository.getDueCardsByDeck).mockRejectedValue(
			new Error("Database error"),
		);

		const { result } = renderHook(() => useDueCardsByDeck(deckId, userId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: エッジケース - 空の結果セット
	test("TC-003: Should return empty array when no due cards exist", async () => {
		const deckId = "deck-123";
		const userId = "user-123";

		vi.mocked(cardsRepository.getDueCardsByDeck).mockResolvedValue([]);

		const { result } = renderHook(() => useDueCardsByDeck(deckId, userId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});
});
