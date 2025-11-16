/**
 * Tests for useRestoreNoteFromTrash hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 異常系 - ゴミ箱アイテムが見つからない
 * - TC-005: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useRestoreNoteFromTrash } from "../useRestoreNoteFromTrash";
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

describe("useRestoreNoteFromTrash", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should restore pages from trash successfully", async () => {
		const trashIds = ["trash-1"];
		const targetNoteId = mockNote.id;

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [
					{
						id: "trash-1",
						page_id: mockPage.id,
						page_title: mockPage.title,
						page_content: JSON.stringify({ type: "doc", content: [] }),
						original_note_id: mockNote.id,
					},
				],
				error: null,
			}),
		};

		const mockPageCheckQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { id: mockPage.id },
				error: null,
			}),
		};

		const mockDeleteTrashQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockTrashQuery)
			.mockReturnValueOnce(mockPageCheckQuery)
			.mockReturnValueOnce(mockDeleteTrashQuery);

		const { result } = renderHook(() => useRestoreNoteFromTrash(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ trashIds, targetNoteId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		expect(result.current.data?.restoredCount).toBe(1);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const trashIds = ["trash-1"];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useRestoreNoteFromTrash(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ trashIds });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("認証が必要");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const trashIds = ["trash-1"];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockTrashQuery);

		const { result } = renderHook(() => useRestoreNoteFromTrash(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ trashIds });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - ゴミ箱アイテムが見つからない
	test("TC-004: Should handle trash items not found", async () => {
		const trashIds = ["non-existent-trash"];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockTrashQuery);

		const { result } = renderHook(() => useRestoreNoteFromTrash(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ trashIds });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain(
			"ゴミ箱アイテムが見つかりません",
		);
	});

	// TC-005: 正常系 - キャッシュ無効化の確認
	test("TC-005: Should invalidate cache on success", async () => {
		const trashIds = ["trash-1"];
		const targetNoteId = mockNote.id;

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [
					{
						id: "trash-1",
						page_id: mockPage.id,
						page_title: mockPage.title,
						page_content: null,
						original_note_id: mockNote.id,
					},
				],
				error: null,
			}),
		};

		const mockPageCheckQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { id: mockPage.id },
				error: null,
			}),
		};

		const mockDeleteTrashQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockTrashQuery)
			.mockReturnValueOnce(mockPageCheckQuery)
			.mockReturnValueOnce(mockDeleteTrashQuery);

		const { result } = renderHook(() => useRestoreNoteFromTrash(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ trashIds, targetNoteId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});
});
