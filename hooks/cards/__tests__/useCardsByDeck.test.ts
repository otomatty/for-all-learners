/**
 * Tests for useCardsByDeck hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: エッジケース - 空の結果セット
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { cardsRepository } from "@/lib/repositories/cards-repository";
import { useCardsByDeck } from "../useCardsByDeck";
import { createWrapper, mockLocalCard } from "./helpers";

// Mock the cards repository
vi.mock("@/lib/repositories/cards-repository", () => ({
	cardsRepository: {
		getByDeckId: vi.fn(),
	},
}));

describe("useCardsByDeck", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch cards by deck successfully", async () => {
		const cards = [mockLocalCard];
		const deckId = "deck-123";

		vi.mocked(cardsRepository.getByDeckId).mockResolvedValue(cards);

		const { result } = renderHook(() => useCardsByDeck(deckId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(1);
		expect(result.current.data?.[0]?.id).toBe(mockLocalCard.id);
		expect(cardsRepository.getByDeckId).toHaveBeenCalledWith(deckId);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const deckId = "deck-123";

		vi.mocked(cardsRepository.getByDeckId).mockRejectedValue(
			new Error("Database error"),
		);

		const { result } = renderHook(() => useCardsByDeck(deckId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: エッジケース - 空の結果セット
	test("TC-003: Should return empty array when no cards exist", async () => {
		const deckId = "deck-123";

		vi.mocked(cardsRepository.getByDeckId).mockResolvedValue([]);

		const { result } = renderHook(() => useCardsByDeck(deckId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});
});
