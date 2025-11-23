/**
 * Tests for useGenerateCardsFromPage hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - カード生成成功（データベース保存なし）
 * - TC-002: 正常系 - カード生成成功（データベース保存あり）
 * - TC-003: 異常系 - APIエラー
 * - TC-004: 異常系 - ネットワークエラー
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useGenerateCardsFromPage } from "../useGenerateCardsFromPage";

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

describe("useGenerateCardsFromPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - カード生成成功（データベース保存なし）
	test("TC-001: Should generate cards successfully without saving", async () => {
		const mockCards = [
			{
				front_content: "What is React?",
				back_content: "A JavaScript library",
			},
		];

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ cards: mockCards }),
		} as Response);

		const { result } = renderHook(() => useGenerateCardsFromPage(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const response = await mutation.mutateAsync({
			pageContentTiptap: { type: "doc", content: [] },
			pageId: "page-123",
			deckId: "deck-123",
			saveToDatabase: false,
		});

		await waitFor(() => {
			expect(response.cards).toEqual(mockCards);
		});

		expect(fetch).toHaveBeenCalledWith("/api/ai/generate-cards-from-page", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
				deckId: "deck-123",
				saveToDatabase: false,
			}),
		});
	});

	// TC-002: 正常系 - カード生成成功（データベース保存あり）
	test("TC-002: Should generate cards and save to database", async () => {
		const mockCards = [
			{
				front_content: "What is React?",
				back_content: "A JavaScript library",
			},
		];

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ cards: mockCards, savedCardsCount: 1 }),
		} as Response);

		const { result } = renderHook(() => useGenerateCardsFromPage(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const response = await mutation.mutateAsync({
			pageContentTiptap: { type: "doc", content: [] },
			pageId: "page-123",
			deckId: "deck-123",
			saveToDatabase: true,
		});

		await waitFor(() => {
			expect(response.cards).toEqual(mockCards);
			expect(response.savedCardsCount).toBe(1);
		});
	});

	// TC-003: 異常系 - APIエラー
	test("TC-003: Should handle API error", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ error: "pageIdは必須です" }),
		} as Response);

		const { result } = renderHook(() => useGenerateCardsFromPage(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "",
				deckId: "deck-123",
			}),
		).rejects.toThrow("pageIdは必須です");
	});

	// TC-004: 異常系 - ネットワークエラー
	test("TC-004: Should handle network error", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useGenerateCardsFromPage(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
				deckId: "deck-123",
			}),
		).rejects.toThrow("Network error");
	});
});
