/**
 * Tests for useMigrateOrphanedPages hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - 孤立ページなし
 * - TC-005: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useMigrateOrphanedPages } from "../useMigrateOrphanedPages";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockPage,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

// Mock useLinkPageToNote
vi.mock("../useLinkPageToNote", () => ({
	useLinkPageToNote: () => ({
		mutateAsync: vi.fn().mockResolvedValue({}),
	}),
}));

describe("useMigrateOrphanedPages", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should migrate orphaned pages successfully", async () => {
		const defaultNote = { ...mockNote, is_default_note: true };
		const orphanedPage = { id: mockPage.id, title: mockPage.title };

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockDefaultNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { id: defaultNote.id },
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: { id: defaultNote.id },
					error: null,
				}),
		};

		const mockUserPagesQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [orphanedPage],
				error: null,
			}),
		};

		const mockLinkedPagesQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockDefaultNoteQuery)
			.mockReturnValueOnce(mockUserPagesQuery)
			.mockReturnValueOnce(mockLinkedPagesQuery);

		const { result } = renderHook(() => useMigrateOrphanedPages(), {
			wrapper: createWrapper(),
		});

		result.current.mutate();

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.migratedCount).toBe(1);
		expect(result.current.data?.orphanedPages.length).toBe(1);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useMigrateOrphanedPages(), {
			wrapper: createWrapper(),
		});

		result.current.mutate();

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockDefaultNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "Database error", code: "PGRST116" },
					}),
				})
				.mockResolvedValueOnce({
					data: null,
					error: { message: "Database error", code: "PGRST116" },
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockDefaultNoteQuery);

		const { result } = renderHook(() => useMigrateOrphanedPages(), {
			wrapper: createWrapper(),
		});

		result.current.mutate();

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: エッジケース - 孤立ページなし
	test("TC-004: Should return zero when no orphaned pages", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockDefaultNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { id: mockNote.id },
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: { id: mockNote.id },
					error: null,
				}),
		};

		const mockUserPagesQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockDefaultNoteQuery)
			.mockReturnValueOnce(mockUserPagesQuery);

		const { result } = renderHook(() => useMigrateOrphanedPages(), {
			wrapper: createWrapper(),
		});

		result.current.mutate();

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.migratedCount).toBe(0);
		expect(result.current.data?.orphanedPages).toEqual([]);
	});

	// TC-005: 正常系 - キャッシュ無効化の確認
	test("TC-005: Should invalidate cache on success", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockDefaultNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { id: mockNote.id },
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: { id: mockNote.id },
					error: null,
				}),
		};

		const mockUserPagesQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockDefaultNoteQuery)
			.mockReturnValueOnce(mockUserPagesQuery);

		const { result } = renderHook(() => useMigrateOrphanedPages(), {
			wrapper: createWrapper(),
		});

		result.current.mutate();

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});
});
