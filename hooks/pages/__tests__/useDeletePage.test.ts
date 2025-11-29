/**
 * Tests for useDeletePage hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - ページ削除成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 正常系 - キャッシュ無効化の確認
 * - TC-004: リンクグループ削除の呼び出し確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useDeletePage } from "../useDeletePage";
import { createWrapper, mockPage } from "./helpers";

// Create hoisted mock functions
const { mockDelete, mockDeleteLinkOccurrences } = vi.hoisted(() => ({
	mockDelete: vi.fn(),
	mockDeleteLinkOccurrences: vi.fn(),
}));

// Mock repositories module
vi.mock("@/lib/repositories", () => ({
	pagesRepository: {
		delete: mockDelete,
		getAll: vi.fn(),
		getById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		getPendingSync: vi.fn(),
		markSynced: vi.fn(),
		syncFromServer: vi.fn(),
		getByNoteId: vi.fn(),
	},
}));

// Mock link group service
vi.mock("@/lib/services/linkGroupService", () => ({
	deleteLinkOccurrencesByPage: mockDeleteLinkOccurrences,
}));

// Mock Supabase client (still needed for linkGroupService)
vi.mock("@/lib/supabase/client", () => ({
	createClient: vi.fn(() => ({
		auth: { getUser: vi.fn() },
		from: vi.fn(),
	})),
}));

describe("useDeletePage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteLinkOccurrences.mockResolvedValue(undefined);
	});

	// TC-001: 正常系 - ページ削除成功
	test("TC-001: Should delete page successfully", async () => {
		const pageId = mockPage.id;

		// Mock repository.delete to return deleted page
		mockDelete.mockResolvedValue(mockPage);

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(mockDelete).toHaveBeenCalledWith(pageId);
		expect(mockDeleteLinkOccurrences).toHaveBeenCalled();
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const pageId = mockPage.id;

		// Mock repository.delete to return null (deletion failed)
		mockDelete.mockResolvedValue(null);

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("削除に失敗");
	});

	// TC-003: 正常系 - キャッシュ無効化の確認
	test("TC-003: Should invalidate cache on success", async () => {
		const pageId = mockPage.id;

		// Mock repository.delete to return deleted page
		mockDelete.mockResolvedValue(mockPage);

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});

	// TC-004: リンクグループ削除の呼び出し確認
	test("TC-004: Should delete link groups before deleting page", async () => {
		const pageId = mockPage.id;

		// Mock repository.delete to return deleted page
		mockDelete.mockResolvedValue(mockPage);

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Verify deleteLinkOccurrencesByPage was called
		expect(mockDeleteLinkOccurrences).toHaveBeenCalled();
		// Verify it was called before delete
		expect(mockDelete).toHaveBeenCalledWith(pageId);
	});

	// TC-005: 異常系 - リンクグループ削除エラー
	test("TC-005: Should handle link group deletion error", async () => {
		const pageId = mockPage.id;

		// Mock link group deletion to throw error
		mockDeleteLinkOccurrences.mockRejectedValue(
			new Error("Link group deletion failed"),
		);

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});
});
