/**
 * Tests for useSaveCards hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - カード保存成功
 * - TC-002: 異常系 - APIエラー
 * - TC-003: 異常系 - ネットワークエラー
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSaveCards } from "../useSaveCards";

// Helper to create test wrapper
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

// Mock fetch
global.fetch = vi.fn();

describe("useSaveCards", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - カード保存成功
	test("TC-001: Should save cards successfully", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ savedCardsCount: 2 }),
		} as Response);

		const { result } = renderHook(() => useSaveCards(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const response = await mutation.mutateAsync({
			cards: [
				{
					front_content: "Question 1",
					back_content: "Answer 1",
				},
				{
					front_content: "Question 2",
					back_content: "Answer 2",
				},
			],
			pageId: "page-123",
			deckId: "deck-123",
		});

		await waitFor(() => {
			expect(response.savedCardsCount).toBe(2);
		});

		expect(fetch).toHaveBeenCalledWith("/api/cards/save", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				cards: [
					{
						front_content: "Question 1",
						back_content: "Answer 1",
					},
					{
						front_content: "Question 2",
						back_content: "Answer 2",
					},
				],
				pageId: "page-123",
				deckId: "deck-123",
			}),
		});
	});

	// TC-002: 異常系 - APIエラー
	test("TC-002: Should handle API error", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ error: "cardsは配列である必要があります" }),
		} as Response);

		const { result } = renderHook(() => useSaveCards(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				cards: [],
				pageId: "page-123",
				deckId: "deck-123",
			}),
		).rejects.toThrow("cardsは配列である必要があります");
	});

	// TC-003: 異常系 - ネットワークエラー
	test("TC-003: Should handle network error", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useSaveCards(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				cards: [
					{
						front_content: "Question",
						back_content: "Answer",
					},
				],
				pageId: "page-123",
				deckId: "deck-123",
			}),
		).rejects.toThrow("Network error");
	});
});
