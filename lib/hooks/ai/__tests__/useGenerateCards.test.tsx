/**
 * Tests for useGenerateCards hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - カード生成成功
 * - TC-002: 異常系 - APIエラー
 * - TC-003: 異常系 - ネットワークエラー
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useGenerateCards } from "../useGenerateCards";

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

describe("useGenerateCards", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - カード生成成功
	test("TC-001: Should generate cards successfully", async () => {
		const mockCards = [
			{
				front_content: "What is React?",
				back_content: "A JavaScript library",
				source_audio_url: "https://example.com/audio.mp3",
			},
		];

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ cards: mockCards }),
		} as Response);

		const { result } = renderHook(() => useGenerateCards(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const response = await mutation.mutateAsync({
			transcript: "React is a JavaScript library",
			sourceAudioUrl: "https://example.com/audio.mp3",
		});

		await waitFor(() => {
			expect(response.cards).toEqual(mockCards);
		});

		expect(fetch).toHaveBeenCalledWith("/api/ai/generate-cards", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				transcript: "React is a JavaScript library",
				sourceAudioUrl: "https://example.com/audio.mp3",
			}),
		});
	});

	// TC-002: 異常系 - APIエラー
	test("TC-002: Should handle API error", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ error: "transcriptは必須です" }),
		} as Response);

		const { result } = renderHook(() => useGenerateCards(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				transcript: "",
				sourceAudioUrl: "https://example.com/audio.mp3",
			}),
		).rejects.toThrow("transcriptは必須です");
	});

	// TC-003: 異常系 - ネットワークエラー
	test("TC-003: Should handle network error", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useGenerateCards(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				transcript: "Transcript text",
				sourceAudioUrl: "https://example.com/audio.mp3",
			}),
		).rejects.toThrow("Network error");
	});
});
