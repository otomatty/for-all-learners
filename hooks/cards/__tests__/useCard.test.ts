/**
 * Tests for useCard hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 異常系 - カードが見つからない
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { cardsRepository } from "@/lib/repositories/cards-repository";
import { useCard } from "../useCard";
import { createWrapper, mockLocalCard } from "./helpers";

// Mock the cards repository
vi.mock("@/lib/repositories/cards-repository", () => ({
	cardsRepository: {
		getById: vi.fn(),
	},
}));

describe("useCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch card by id successfully", async () => {
		const cardId = "card-123";

		vi.mocked(cardsRepository.getById).mockResolvedValue(mockLocalCard);

		const { result } = renderHook(() => useCard(cardId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.id).toBe(mockLocalCard.id);
		expect(cardsRepository.getById).toHaveBeenCalledWith(cardId);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const cardId = "card-123";

		vi.mocked(cardsRepository.getById).mockRejectedValue(
			new Error("Database error"),
		);

		const { result } = renderHook(() => useCard(cardId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - カードが見つからない
	test("TC-003: Should handle card not found", async () => {
		const cardId = "card-123";

		vi.mocked(cardsRepository.getById).mockResolvedValue(undefined);

		const { result } = renderHook(() => useCard(cardId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		// エラーが発生することを確認
		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toBe("Card not found");
	});
});
