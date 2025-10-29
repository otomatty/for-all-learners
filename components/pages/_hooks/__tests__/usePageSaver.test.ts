/**
 * Tests for usePageSaver hook
 *
 * Note: These are basic smoke tests to verify the hook's structure and API.
 * Full integration testing with mocked dependencies should be performed
 * in a browser environment or with proper E2E testing tools.
 *
 * The hook depends on:
 * - updatePage server action
 * - toast notifications
 * - logger
 * These are difficult to mock properly in unit tests, so we focus on
 * testing the hook's interface and basic behavior.
 */

import { renderHook } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { usePageSaver } from "../usePageSaver";

describe("usePageSaver", () => {
	const mockEditor = {
		getJSON: () => ({ type: "doc", content: [] }),
	} as unknown as Editor;

	describe("Hook API", () => {
		it("should return savePage function and isSaving state", () => {
			const { result } = renderHook(() => usePageSaver(null, "id", "title"));

			expect(result.current).toHaveProperty("savePage");
			expect(result.current).toHaveProperty("isSaving");
			expect(typeof result.current.savePage).toBe("function");
			expect(typeof result.current.isSaving).toBe("boolean");
		});

		it("should initialize with isSaving as false", () => {
			const { result } = renderHook(() => usePageSaver(null, "id", "title"));

			expect(result.current.isSaving).toBe(false);
		});
	});

	describe("Null Editor Handling", () => {
		it("should handle null editor gracefully", async () => {
			const { result } = renderHook(() => usePageSaver(null, "id", "title"));

			// Should not throw when editor is null
			await expect(result.current.savePage()).resolves.toBeUndefined();
		});
	});

	describe("Options", () => {
		it("should accept optional callbacks", () => {
			const onSaveSuccess = () => {};
			const onSaveError = () => {};
			const setIsLoading = () => {};
			const setIsDirty = () => {};

			const { result } = renderHook(() =>
				usePageSaver(mockEditor, "id", "title", {
					onSaveSuccess,
					onSaveError,
					setIsLoading,
					setIsDirty,
				}),
			);

			expect(result.current).toBeDefined();
		});

		it("should work without any options", () => {
			const { result } = renderHook(() =>
				usePageSaver(mockEditor, "id", "title"),
			);

			expect(result.current).toBeDefined();
		});
	});

	describe("State Management", () => {
		it("should provide isSaving state", () => {
			const { result } = renderHook(() =>
				usePageSaver(mockEditor, "id", "title"),
			);

			expect(result.current.isSaving).toBe(false);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty title", () => {
			const { result } = renderHook(() => usePageSaver(mockEditor, "id", ""));

			expect(result.current).toBeDefined();
		});

		it("should handle empty pageId", () => {
			const { result } = renderHook(() =>
				usePageSaver(mockEditor, "", "title"),
			);

			expect(result.current).toBeDefined();
		});
	});

	describe("Cleanup", () => {
		it("should not throw errors on unmount", () => {
			const { unmount } = renderHook(() =>
				usePageSaver(mockEditor, "id", "title"),
			);

			// Should not throw when unmounting
			expect(() => unmount()).not.toThrow();
		});
	});

	describe("Type Safety", () => {
		it("should accept valid Editor type", () => {
			const { result } = renderHook(() =>
				usePageSaver(mockEditor, "id", "title"),
			);

			expect(result.current.savePage).toBeDefined();
		});

		it("should accept null as editor", () => {
			const { result } = renderHook(() => usePageSaver(null, "id", "title"));

			expect(result.current.savePage).toBeDefined();
		});
	});

	describe("Integration Points", () => {
		it("should be compatible with useEffect dependencies", () => {
			const { result, rerender } = renderHook(
				({ pageId, title }) => usePageSaver(mockEditor, pageId, title),
				{
					initialProps: { pageId: "id1", title: "title1" },
				},
			);

			const savePage1 = result.current.savePage;

			rerender({ pageId: "id2", title: "title2" });

			const savePage2 = result.current.savePage;

			// savePage function should be recreated when dependencies change
			expect(savePage1).not.toBe(savePage2);
		});
	});
});
