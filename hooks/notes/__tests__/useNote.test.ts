/**
 * Tests for useNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - データが存在しない場合
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - slugが空の場合のenabled: false確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useNote } from "../useNote";
import { createWrapper, mockNote, mockUser } from "./helpers";

// Create hoisted mock functions
const { mockGetBySlug } = vi.hoisted(() => ({
	mockGetBySlug: vi.fn(),
}));

// Mock repositories module
vi.mock("@/lib/repositories", () => ({
	notesRepository: {
		getBySlug: mockGetBySlug,
		getAll: vi.fn(),
		getById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		getPendingSync: vi.fn(),
		markSynced: vi.fn(),
		syncFromServer: vi.fn(),
		getDefaultNote: vi.fn(),
	},
}));

describe("useNote", () => {
	const mockUserId = mockUser.id;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch note successfully", async () => {
		const slug = "test-note";

		// Mock repository.getBySlug to return mockNote
		mockGetBySlug.mockResolvedValue(mockNote);

		const { result } = renderHook(() => useNote(slug, mockUserId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.note.slug).toBe(slug);
		expect(result.current.data?.note.title).toBe(mockNote.title);
		expect(mockGetBySlug).toHaveBeenCalledWith(mockUserId, slug);
	});

	// TC-002: 異常系 - データが存在しない場合
	test("TC-002: Should handle note not found", async () => {
		const slug = "non-existent-note";

		// Mock repository.getBySlug to return null (not found)
		mockGetBySlug.mockResolvedValue(null);

		const { result } = renderHook(() => useNote(slug, mockUserId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toBe("Note not found");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const slug = "test-note";

		// Mock repository.getBySlug to throw an error
		mockGetBySlug.mockRejectedValue(new Error("Database error"));

		const { result } = renderHook(() => useNote(slug, mockUserId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: エッジケース - slugが空の場合のenabled: false確認
	test("TC-004: Should not fetch when slug is empty", () => {
		const slug = "";

		const { result } = renderHook(() => useNote(slug, mockUserId), {
			wrapper: createWrapper(),
		});

		// Query should be disabled when slug is empty
		expect(result.current.isFetching).toBe(false);
		expect(result.current.isLoading).toBe(false);
		expect(mockGetBySlug).not.toHaveBeenCalled();
	});

	test("TC-004b: Should not fetch when slug is undefined", () => {
		const slug = undefined as unknown as string;

		const { result } = renderHook(() => useNote(slug, mockUserId), {
			wrapper: createWrapper(),
		});

		// Query should be disabled when slug is undefined
		expect(result.current.isFetching).toBe(false);
		expect(result.current.isLoading).toBe(false);
		expect(mockGetBySlug).not.toHaveBeenCalled();
	});
});
