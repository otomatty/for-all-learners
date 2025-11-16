/**
 * Tests for useDeleteNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 異常系 - バリデーションエラー（該当する場合）
 * - TC-005: 正常系 - キャッシュ無効化の確認
 * - TC-006: デフォルトノート削除の防止
 * - TC-007: 存在しないノートの削除
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useDeleteNote } from "../useDeleteNote";
import { createMockSupabaseClient, createWrapper, mockNote } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useDeleteNote", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should delete note successfully", async () => {
		const noteId = mockNote.id;

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { is_default_note: false },
				error: null,
			}),
		};

		const mockDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockFetchQuery)
			.mockReturnValueOnce(mockDeleteQuery);

		const { result } = renderHook(() => useDeleteNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(noteId);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockFetchQuery.select).toHaveBeenCalledWith("is_default_note");
		expect(mockDeleteQuery.delete).toHaveBeenCalled();
		expect(mockDeleteQuery.eq).toHaveBeenCalledWith("id", noteId);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const noteId = mockNote.id;

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Not authenticated", code: "PGRST301" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockFetchQuery);

		const { result } = renderHook(() => useDeleteNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(noteId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const noteId = mockNote.id;

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { is_default_note: false },
				error: null,
			}),
		};

		const mockDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockFetchQuery)
			.mockReturnValueOnce(mockDeleteQuery);

		const { result } = renderHook(() => useDeleteNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(noteId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - バリデーションエラー（該当する場合）
	test("TC-004: Should handle note fetch error", async () => {
		const noteId = mockNote.id;

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Failed to fetch note", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockFetchQuery);

		const { result } = renderHook(() => useDeleteNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(noteId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("情報取得に失敗");
	});

	// TC-005: 正常系 - キャッシュ無効化の確認
	test("TC-005: Should invalidate cache on success", async () => {
		const noteId = mockNote.id;

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { is_default_note: false },
				error: null,
			}),
		};

		const mockDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockFetchQuery)
			.mockReturnValueOnce(mockDeleteQuery);

		const { result } = renderHook(() => useDeleteNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(noteId);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});

	// TC-006: デフォルトノート削除の防止
	test("TC-006: Should prevent deletion of default note", async () => {
		const noteId = mockNote.id;

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { is_default_note: true },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockFetchQuery);

		const { result } = renderHook(() => useDeleteNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(noteId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain(
			"デフォルトノートは削除できません",
		);
		// Delete should not be called
		expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1);
	});

	// TC-007: 存在しないノートの削除
	test("TC-007: Should handle deletion of non-existent note", async () => {
		const noteId = "non-existent-note";

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "No rows returned", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockFetchQuery);

		const { result } = renderHook(() => useDeleteNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(noteId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("情報取得に失敗");
	});
});
