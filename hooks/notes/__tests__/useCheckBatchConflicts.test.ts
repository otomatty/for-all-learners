/**
 * Tests for useCheckBatchConflicts hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功（競合なし）
 * - TC-002: 正常系 - 操作成功（競合あり）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - 空のページリスト
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useCheckBatchConflicts } from "../useCheckBatchConflicts";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockPage,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

// Mock useCheckPageConflict
const mockMutateAsync = vi.fn().mockResolvedValue([]);
vi.mock("../useCheckPageConflict", () => ({
	useCheckPageConflict: () => ({
		mutateAsync: mockMutateAsync,
	}),
}));

describe("useCheckBatchConflicts", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockMutateAsync.mockResolvedValue([]);
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功（競合なし）
	test("TC-001: Should return empty array when no conflicts", async () => {
		const pageIds = [mockPage.id];
		const targetNoteId = mockNote.id;

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [{ id: mockPage.id, title: mockPage.title }],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCheckBatchConflicts(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds, targetNoteId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});

	// TC-002: 正常系 - 操作成功（競合あり）
	test("TC-002: Should return conflicts when they exist", async () => {
		const pageIds = [mockPage.id];
		const targetNoteId = mockNote.id;

		const conflictPage = {
			id: "conflict-page-1",
			title: mockPage.title,
			created_at: "2025-01-01T00:00:00Z",
			updated_at: "2025-01-01T00:00:00Z",
			content_tiptap: { type: "doc", content: [] },
		};

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [{ id: mockPage.id, title: mockPage.title }],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		// Mock useCheckPageConflict to return conflicts
		mockMutateAsync.mockResolvedValue([conflictPage]);

		const { result } = renderHook(() => useCheckBatchConflicts(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds, targetNoteId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(1);
		expect(result.current.data?.[0]?.pageId).toBe(mockPage.id);
		expect(result.current.data?.[0]?.existingPages.length).toBe(1);
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const pageIds = [mockPage.id];
		const targetNoteId = mockNote.id;

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCheckBatchConflicts(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds, targetNoteId });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: エッジケース - 空のページリスト
	test("TC-004: Should return empty array when pageIds is empty", async () => {
		const pageIds: string[] = [];
		const targetNoteId = mockNote.id;

		// Mock pages query to return empty array
		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCheckBatchConflicts(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds, targetNoteId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});
});
