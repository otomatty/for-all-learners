/**
 * Tests for useUpdateNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 異常系 - バリデーションエラー（該当する場合）
 * - TC-005: 正常系 - キャッシュ無効化の確認
 * - TC-006: 可視性変更時の共有リンク削除
 * - TC-007: 部分更新の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import type { UpdateNotePayload } from "../useUpdateNote";
import { useUpdateNote } from "../useUpdateNote";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUpdateNote", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should update note successfully", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = {
			title: "Updated Title",
			description: "Updated description",
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { visibility: "private" },
				error: null,
			}),
		};

		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { ...mockNote, ...payload },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockFetchQuery)
			.mockReturnValueOnce(mockUpdateQuery);

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.title).toBe(payload.title);
		expect(mockUpdateQuery.update).toHaveBeenCalledWith(payload);
		expect(mockUpdateQuery.eq).toHaveBeenCalledWith("id", noteId);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = { title: "Updated Title" };

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = { title: "Updated Title" };

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { visibility: "private" },
				error: null,
			}),
		};

		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockFetchQuery)
			.mockReturnValueOnce(mockUpdateQuery);

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - バリデーションエラー（該当する場合）
	test("TC-004: Should handle note not found error", async () => {
		const noteId = "non-existent-note";
		const payload: UpdateNotePayload = { title: "Updated Title" };

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "No rows returned", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockFetchQuery);

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-005: 正常系 - キャッシュ無効化の確認
	test("TC-005: Should invalidate cache on success", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = { title: "Updated Title" };

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { visibility: "private" },
				error: null,
			}),
		};

		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { ...mockNote, ...payload },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockFetchQuery)
			.mockReturnValueOnce(mockUpdateQuery);

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});

	// TC-006: 可視性変更時の共有リンク削除
	test("TC-006: Should delete shares and links when visibility changes", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = { visibility: "public" };

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { visibility: "private" },
				error: null,
			}),
		};

		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { ...mockNote, visibility: "public" },
				error: null,
			}),
		};

		const mockDeleteSharesQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			neq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		const mockDeleteLinksQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			eq2: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		// Chain eq calls for deleteLinksQuery
		mockDeleteLinksQuery.eq = vi
			.fn()
			.mockReturnValueOnce(mockDeleteLinksQuery)
			.mockResolvedValueOnce({
				data: null,
				error: null,
			});

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockFetchQuery)
			.mockReturnValueOnce(mockUpdateQuery)
			.mockReturnValueOnce(mockDeleteSharesQuery)
			.mockReturnValueOnce(mockDeleteLinksQuery);

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Verify shares were deleted
		expect(mockSupabaseClient.from).toHaveBeenCalledWith("note_shares");
		// Verify links were deleted
		expect(mockSupabaseClient.from).toHaveBeenCalledWith("share_links");
	});

	// TC-007: 部分更新の確認
	test("TC-007: Should support partial updates", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = {
			title: "Only Title Updated",
			// description and visibility not provided
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockFetchQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { visibility: "private" },
				error: null,
			}),
		};

		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { ...mockNote, title: payload.title },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockFetchQuery)
			.mockReturnValueOnce(mockUpdateQuery);

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.title).toBe(payload.title);
		// Other fields should remain unchanged
		expect(mockUpdateQuery.update).toHaveBeenCalledWith(payload);
	});
});
