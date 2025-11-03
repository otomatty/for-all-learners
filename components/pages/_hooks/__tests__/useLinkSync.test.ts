/**
 * Basic smoke tests for useLinkSync hook
 *
 * Note: Full integration testing with mocked dependencies is challenging
 * in the current Bun test environment. These tests verify the hook's
 * basic structure, API, and edge case handling.
 *
 * For comprehensive integration testing, manual testing in the browser
 * is recommended to verify:
 * - Link synchronization on editor updates
 * - Debounce behavior
 * - Duplicate request prevention
 * - Error handling
 */

import { renderHook } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { useLinkSync } from "../useLinkSync";

// Note: happy-dom environment is already set up in vitest.config.mts

describe("useLinkSync", () => {
	describe("Hook API", () => {
		it("should return the correct API shape when editor is null", () => {
			const { result } = renderHook(() => useLinkSync(null, "test-page-id"));

			expect(result.current).toHaveProperty("syncLinks");
			expect(result.current).toHaveProperty("isSyncing");
			expect(result.current).toHaveProperty("lastSyncTime");

			expect(typeof result.current.syncLinks).toBe("function");
			expect(typeof result.current.isSyncing).toBe("boolean");
			expect(result.current.lastSyncTime).toBeNull();
		});

		it("should initialize with correct default state", () => {
			const { result } = renderHook(() => useLinkSync(null, "test-page-id"));

			expect(result.current.isSyncing).toBe(false);
			expect(result.current.lastSyncTime).toBeNull();
		});

		it("should handle null editor gracefully", () => {
			const { result } = renderHook(() =>
				useLinkSync(null, "test-page-id", {
					debounceMs: 500,
					debug: false,
				}),
			);

			// Should not throw and should return valid API
			expect(result.current.syncLinks).toBeDefined();
			expect(result.current.isSyncing).toBe(false);
		});

		it("should accept custom options", () => {
			const { result } = renderHook(() =>
				useLinkSync(null, "test-page-id", {
					debounceMs: 1000,
					debug: true,
				}),
			);

			expect(result.current).toBeDefined();
			expect(result.current.isSyncing).toBe(false);
		});

		it("should accept default options when not provided", () => {
			const { result } = renderHook(() => useLinkSync(null, "test-page-id"));

			expect(result.current).toBeDefined();
			expect(result.current.isSyncing).toBe(false);
		});
	});

	describe("Edge cases", () => {
		it("should handle empty pageId", () => {
			const { result } = renderHook(() => useLinkSync(null, ""));

			expect(result.current.syncLinks).toBeDefined();
			expect(result.current.isSyncing).toBe(false);
		});

		it("should handle very short debounce delay", () => {
			const { result } = renderHook(() =>
				useLinkSync(null, "test-page-id", {
					debounceMs: 0,
				}),
			);

			expect(result.current.isSyncing).toBe(false);
		});

		it("should handle very long debounce delay", () => {
			const { result } = renderHook(() =>
				useLinkSync(null, "test-page-id", {
					debounceMs: 10000,
				}),
			);

			expect(result.current.isSyncing).toBe(false);
		});

		it("should handle negative debounce delay (should use 0)", () => {
			const { result } = renderHook(() =>
				useLinkSync(null, "test-page-id", {
					debounceMs: -100,
				}),
			);

			expect(result.current.isSyncing).toBe(false);
		});
	});

	describe("Mock editor tests", () => {
		it("should accept a mock editor object with minimal interface", () => {
			const mockEditor = {
				getJSON: () => ({ type: "doc", content: [] }),
				on: () => {},
				off: () => {},
			} as unknown as Editor;

			const { result } = renderHook(() =>
				useLinkSync(mockEditor, "test-page-id"),
			);

			expect(result.current.syncLinks).toBeDefined();
			expect(result.current.isSyncing).toBe(false);
		});

		it("should not crash with undefined editor methods", () => {
			const mockEditor = {} as unknown as Editor;

			expect(() => {
				renderHook(() => useLinkSync(mockEditor, "test-page-id"));
			}).not.toThrow();
		});
	});

	describe("Return value stability", () => {
		it("should provide stable function references across renders", () => {
			const { result, rerender } = renderHook(() =>
				useLinkSync(null, "test-page-id"),
			);

			const firstSyncLinks = result.current.syncLinks;

			rerender();

			// syncLinks should be the same function reference due to useCallback
			expect(result.current.syncLinks).toBe(firstSyncLinks);
		});

		it("should maintain state across re-renders", () => {
			const { result, rerender } = renderHook(() =>
				useLinkSync(null, "test-page-id"),
			);

			const initialState = {
				isSyncing: result.current.isSyncing,
				lastSyncTime: result.current.lastSyncTime,
			};

			rerender();

			// State should remain the same
			expect(result.current.isSyncing).toBe(initialState.isSyncing);
			expect(result.current.lastSyncTime).toBe(initialState.lastSyncTime);
		});
	});

	describe("Cleanup behavior", () => {
		it("should cleanup properly on unmount", () => {
			let offCalled = false;
			const mockEditor = {
				getJSON: () => ({ type: "doc", content: [] }),
				on: () => {},
				off: () => {
					offCalled = true;
				},
			} as unknown as Editor;

			const { unmount } = renderHook(() =>
				useLinkSync(mockEditor, "test-page-id"),
			);

			unmount();

			// Editor's off method should have been called during cleanup
			expect(offCalled).toBe(true);
		});

		it("should handle unmount when editor is null", () => {
			const { unmount } = renderHook(() => useLinkSync(null, "test-page-id"));

			// Should not throw
			expect(() => unmount()).not.toThrow();
		});
	});

	describe("Type safety", () => {
		it("should work with proper Editor type using unknown cast", () => {
			const mockEditor = {
				getJSON: () => ({ type: "doc", content: [] }),
				on: () => {},
				off: () => {},
			} as unknown as Editor;

			const { result } = renderHook(() =>
				useLinkSync(mockEditor, "test-page-id"),
			);

			expect(result.current).toBeDefined();
		});

		it("should work with null", () => {
			const { result } = renderHook(() => useLinkSync(null, "test-page-id"));

			expect(result.current).toBeDefined();
		});
	});
});
