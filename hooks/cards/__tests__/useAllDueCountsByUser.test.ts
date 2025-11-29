/**
 * Tests for useAllDueCountsByUser hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 期限切れカード数取得成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: エッジケース - 空の結果セット
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { cardsRepository } from "@/lib/repositories/cards-repository";
import { useAllDueCountsByUser } from "../useAllDueCountsByUser";
import { createWrapper } from "./helpers";

// Mock the cards repository
vi.mock("@/lib/repositories/cards-repository", () => ({
	cardsRepository: {
		getDueCountsByUser: vi.fn(),
	},
}));

describe("useAllDueCountsByUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - 期限切れカード数取得成功
	test("TC-001: Should fetch all due counts by user successfully", async () => {
		const userId = "user-123";
		const dueCounts = { "deck-1": 2, "deck-2": 1 };

		vi.mocked(cardsRepository.getDueCountsByUser).mockResolvedValue(dueCounts);

		const { result } = renderHook(() => useAllDueCountsByUser(userId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.["deck-1"]).toBe(2);
		expect(result.current.data?.["deck-2"]).toBe(1);
		expect(cardsRepository.getDueCountsByUser).toHaveBeenCalledWith(userId);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const userId = "user-123";

		vi.mocked(cardsRepository.getDueCountsByUser).mockRejectedValue(
			new Error("Database error"),
		);

		const { result } = renderHook(() => useAllDueCountsByUser(userId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: エッジケース - 空の結果セット
	test("TC-003: Should return empty object when no due cards exist", async () => {
		const userId = "user-123";

		vi.mocked(cardsRepository.getDueCountsByUser).mockResolvedValue({});

		const { result } = renderHook(() => useAllDueCountsByUser(userId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual({});
	});
});
