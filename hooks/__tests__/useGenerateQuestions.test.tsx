/**
 * Tests for useGenerateQuestions Hook with LLMProviderContext Integration
 *
 * Test Coverage:
 * - TC-001: Uses context provider by default
 * - TC-002: Options override context config
 * - TC-003: Sends correct request body with provider/model
 * - TC-004: Handles successful response
 * - TC-005: Handles error response
 * - TC-006: Does not fetch when cardIds is null
 * - TC-007: Does not fetch when cardIds is empty array
 * - TC-008: Re-fetches when cardIds change
 */

import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, type Mock, test, vi } from "vitest";
import { LLMProviderProvider } from "@/lib/contexts/LLMProviderContext";
import { useGenerateQuestions } from "../useGenerateQuestions";

// Mock fetch
global.fetch = vi.fn();

// Wrapper component that provides LLMProviderContext
function Wrapper({ children }: { children: React.ReactNode }) {
	return <LLMProviderProvider>{children}</LLMProviderProvider>;
}

describe("useGenerateQuestions with LLMProviderContext", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	// TC-001: Uses context provider by default
	test("TC-001: Uses provider/model from context by default", async () => {
		// Mock successful response
		(fetch as Mock).mockResolvedValue({
			ok: true,
			json: async () => ({
				questions: [
					{ cardId: "card-1", question: { type: "flashcard", content: "Q1" } },
				],
			}),
		});

		const { result } = renderHook(
			() => useGenerateQuestions(["card-1"], "flashcard"),
			{ wrapper: Wrapper },
		);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		// Verify fetch was called with context defaults
		expect(fetch).toHaveBeenCalledWith(
			"/api/practice/generate",
			expect.objectContaining({
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					cardIds: ["card-1"],
					type: "flashcard",
					provider: "google",
					model: "gemini-2.5-flash",
				}),
			}),
		);
	});

	// TC-002: Options override context config
	test("TC-002: Options override context provider/model", async () => {
		(fetch as Mock).mockResolvedValue({
			ok: true,
			json: async () => ({ questions: [] }),
		});

		const { result } = renderHook(
			() =>
				useGenerateQuestions(["card-1"], "flashcard", {
					provider: "openai",
					model: "gpt-4o-mini",
				}),
			{ wrapper: Wrapper },
		);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(fetch).toHaveBeenCalledWith(
			"/api/practice/generate",
			expect.objectContaining({
				body: JSON.stringify({
					cardIds: ["card-1"],
					type: "flashcard",
					provider: "openai",
					model: "gpt-4o-mini",
				}),
			}),
		);
	});

	// TC-003: Sends correct request body
	test("TC-003: Sends correct request body with all parameters", async () => {
		(fetch as Mock).mockResolvedValue({
			ok: true,
			json: async () => ({ questions: [] }),
		});

		renderHook(
			() =>
				useGenerateQuestions(["card-1", "card-2"], "multiple_choice", {
					provider: "anthropic",
					model: "claude-3-5-haiku-latest",
				}),
			{ wrapper: Wrapper },
		);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalled();
		});

		expect(fetch).toHaveBeenCalledWith(
			"/api/practice/generate",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					cardIds: ["card-1", "card-2"],
					type: "multiple_choice",
					provider: "anthropic",
					model: "claude-3-5-haiku-latest",
				}),
			}),
		);
	});

	// TC-004: Handles successful response
	test("TC-004: Returns questions on successful fetch", async () => {
		const mockQuestions = [
			{ cardId: "card-1", question: { type: "flashcard", content: "Q1" } },
			{ cardId: "card-2", question: { type: "flashcard", content: "Q2" } },
		];

		(fetch as Mock).mockResolvedValue({
			ok: true,
			json: async () => ({ questions: mockQuestions }),
		});

		const { result } = renderHook(
			() => useGenerateQuestions(["card-1", "card-2"], "flashcard"),
			{ wrapper: Wrapper },
		);

		await waitFor(() => {
			expect(result.current.questions).toEqual(mockQuestions);
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	// TC-005: Handles error response
	test("TC-005: Sets error on failed fetch", async () => {
		(fetch as Mock).mockResolvedValue({
			ok: false,
			json: async () => ({ error: "API key not found" }),
		});

		const { result } = renderHook(
			() => useGenerateQuestions(["card-1"], "flashcard"),
			{ wrapper: Wrapper },
		);

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});

		expect(result.current.error?.message).toBe("API key not found");
		expect(result.current.questions).toBeNull();
		expect(result.current.isLoading).toBe(false);
	});

	// TC-006: Does not fetch when cardIds is null
	test("TC-006: Does not fetch when cardIds is null", () => {
		const { result } = renderHook(
			() => useGenerateQuestions(null, "flashcard"),
			{ wrapper: Wrapper },
		);

		expect(fetch).not.toHaveBeenCalled();
		expect(result.current.questions).toBeNull();
		expect(result.current.isLoading).toBe(false);
	});

	// TC-007: Does not fetch when cardIds is empty array
	test("TC-007: Does not fetch when cardIds is empty", () => {
		const { result } = renderHook(() => useGenerateQuestions([], "flashcard"), {
			wrapper: Wrapper,
		});

		expect(fetch).not.toHaveBeenCalled();
		expect(result.current.questions).toBeNull();
		expect(result.current.isLoading).toBe(false);
	});

	// TC-008: Re-fetches when cardIds change
	test("TC-008: Re-fetches when cardIds change", async () => {
		(fetch as Mock)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ questions: [{ cardId: "card-1", question: {} }] }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ questions: [{ cardId: "card-2", question: {} }] }),
			});

		const { result, rerender } = renderHook(
			({ ids }) => useGenerateQuestions(ids, "flashcard"),
			{
				wrapper: Wrapper,
				initialProps: { ids: ["card-1"] },
			},
		);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(fetch).toHaveBeenCalledTimes(1);

		// Change cardIds
		rerender({ ids: ["card-2"] });

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledTimes(2);
		});
	});
});
