/**
 * Tests for useDeck hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 異常系 - デッキが見つからない
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { decksRepository } from "@/lib/repositories/decks-repository";
import { useDeck } from "../useDeck";
import { createWrapper, mockLocalDeck } from "./helpers";

// Mock the decks repository
vi.mock("@/lib/repositories/decks-repository", () => ({
	decksRepository: {
		getById: vi.fn(),
	},
}));

describe("useDeck", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch deck successfully", async () => {
		vi.mocked(decksRepository.getById).mockResolvedValue(mockLocalDeck);

		const { result } = renderHook(() => useDeck("deck-123"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.id).toBe(mockLocalDeck.id);
		expect(result.current.data?.title).toBe(mockLocalDeck.title);
		expect(decksRepository.getById).toHaveBeenCalledWith("deck-123");
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		vi.mocked(decksRepository.getById).mockRejectedValue(
			new Error("Database error"),
		);

		const { result } = renderHook(() => useDeck("deck-123"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - デッキが見つからない
	test("TC-003: Should handle deck not found", async () => {
		vi.mocked(decksRepository.getById).mockResolvedValue(undefined);

		const { result } = renderHook(() => useDeck("non-existent-deck"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		// エラーが発生することを確認
		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toBe("Deck not found");
	});
});
