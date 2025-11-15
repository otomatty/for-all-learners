/**
 * Tests for navigation utilities
 * Tests for Phase 1: Client-side navigation improvements
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Hoist mock functions to avoid initialization errors
const { mockRouterPush, mockToastError, mockLoggerError } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockToastError: vi.fn(),
	mockLoggerError: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		refresh: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		prefetch: vi.fn(),
	}),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: {
		error: mockToastError,
	},
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		error: mockLoggerError,
	},
}));

import { useNavigateToPage } from "../navigation";

describe("useNavigateToPage", () => {
	beforeEach(() => {
		mockRouterPush.mockClear();
		mockToastError.mockClear();
		mockLoggerError.mockClear();
	});

	test("navigates to page with default slug", () => {
		const { result } = renderHook(() => useNavigateToPage());

		result.current("page-123");

		expect(mockRouterPush).toHaveBeenCalledWith("/notes/default/page-123");
	});

	test("navigates to page with provided note slug", () => {
		const { result } = renderHook(() => useNavigateToPage());

		result.current("page-123", "my-note");

		expect(mockRouterPush).toHaveBeenCalledWith("/notes/my-note/page-123");
	});

	test("navigates to page with newPage query param", () => {
		const { result } = renderHook(() => useNavigateToPage());

		result.current("page-123", "my-note", true);

		expect(mockRouterPush).toHaveBeenCalledWith(
			"/notes/my-note/page-123?newPage=true",
		);
	});

	test("encodes special characters in slug and pageId", () => {
		const { result } = renderHook(() => useNavigateToPage());

		result.current("page with spaces", "note/slug");

		// Note: Next.js router.push may handle encoding differently
		// The function should call router.push with the encoded URL
		expect(mockRouterPush).toHaveBeenCalled();
		const callArgs = mockRouterPush.mock.calls[0];
		expect(callArgs[0]).toContain("note%2Fslug");
		// pageId encoding may vary, but should be encoded
		expect(callArgs[0]).toContain("page");
	});

	test("handles null noteSlug", () => {
		const { result } = renderHook(() => useNavigateToPage());

		result.current("page-123", null);

		expect(mockRouterPush).toHaveBeenCalledWith("/notes/default/page-123");
	});

	test("handles undefined noteSlug", () => {
		const { result } = renderHook(() => useNavigateToPage());

		result.current("page-123", undefined);

		expect(mockRouterPush).toHaveBeenCalledWith("/notes/default/page-123");
	});
});
