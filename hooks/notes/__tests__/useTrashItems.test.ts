/**
 * Tests for useTrashItems hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - 空の結果セット
 * - TC-005: ページネーション（limit/offset）
 * - TC-006: 総件数の取得
 * - TC-007: hasMoreフラグの確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useTrashItems } from "../useTrashItems";
import { createMockSupabaseClient, createWrapper, mockUser } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useTrashItems", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch trash items successfully", async () => {
		const mockTrashItems = [
			{
				id: "trash-1",
				page_id: "page-1",
				page_title: "Deleted Page",
				page_content: null,
				original_note_id: "note-1",
				deleted_at: "2025-01-01T00:00:00Z",
				auto_delete_at: null,
				metadata: null,
				notes: { title: "Original Note" },
			},
		];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: mockTrashItems,
				error: null,
			}),
		};

		const mockCountQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				count: 1,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockTrashQuery)
			.mockReturnValueOnce(mockCountQuery);

		const { result } = renderHook(() => useTrashItems(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		expect(result.current.data?.trashItems.length).toBe(1);
		expect(result.current.data?.totalCount).toBe(1);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useTrashItems(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("認証が必要");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockTrashQuery);

		const { result } = renderHook(() => useTrashItems(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: エッジケース - 空の結果セット
	test("TC-004: Should return empty array when no trash items exist", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		const mockCountQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				count: 0,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockTrashQuery)
			.mockReturnValueOnce(mockCountQuery);

		const { result } = renderHook(() => useTrashItems(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.trashItems).toEqual([]);
		expect(result.current.data?.totalCount).toBe(0);
	});

	// TC-005: ページネーション（limit/offset）
	test("TC-005: Should support pagination with limit and offset", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		const mockCountQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				count: 10,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockTrashQuery)
			.mockReturnValueOnce(mockCountQuery);

		const { result } = renderHook(
			() => useTrashItems({ limit: 5, offset: 5 }),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockTrashQuery.range).toHaveBeenCalledWith(5, 9); // offset to offset + limit - 1
	});

	// TC-006: 総件数の取得
	test("TC-006: Should fetch total count", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		const mockCountQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				count: 25,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockTrashQuery)
			.mockReturnValueOnce(mockCountQuery);

		const { result } = renderHook(() => useTrashItems(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.totalCount).toBe(25);
	});

	// TC-007: hasMoreフラグの確認
	test("TC-007: Should set hasMore flag correctly", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockTrashQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		const mockCountQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				count: 15,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockTrashQuery)
			.mockReturnValueOnce(mockCountQuery);

		// limit=10, offset=0, total=15 -> hasMore should be true
		const { result } = renderHook(
			() => useTrashItems({ limit: 10, offset: 0 }),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.hasMore).toBe(true);

		// limit=10, offset=10, total=15 -> hasMore should be false
		const mockTrashQuery2 = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		const mockCountQuery2 = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				count: 15,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockTrashQuery2)
			.mockReturnValueOnce(mockCountQuery2);

		const { result: result2 } = renderHook(
			() => useTrashItems({ limit: 10, offset: 10 }),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result2.current.isSuccess).toBe(true);
		});

		expect(result2.current.data?.hasMore).toBe(false);
	});
});
