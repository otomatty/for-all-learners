/**
 * Tests for useCheckPageConflict hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功（競合なし）
 * - TC-002: 正常系 - 操作成功（競合あり）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 除外ページIDの処理
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useCheckPageConflict } from "../useCheckPageConflict";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockPage,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useCheckPageConflict", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功（競合なし）
	test("TC-001: Should return empty array when no conflicts", async () => {
		const noteId = mockNote.id;
		const pageTitle = "Unique Page Title";

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockResolvedValue({
						data: [],
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: [],
					error: null,
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCheckPageConflict(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, pageTitle });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});

	// TC-002: 正常系 - 操作成功（競合あり）
	test("TC-002: Should return conflicts when they exist", async () => {
		const noteId = mockNote.id;
		const pageTitle = "Conflicting Page Title";

		const conflictPage = {
			id: "conflict-page-1",
			title: pageTitle,
			created_at: "2025-01-01T00:00:00Z",
			updated_at: "2025-01-01T00:00:00Z",
			content_tiptap: { type: "doc", content: [] },
			note_page_links: [{ note_id: noteId }],
		};

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockResolvedValue({
						data: [conflictPage],
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: [conflictPage],
					error: null,
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCheckPageConflict(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, pageTitle });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(1);
		expect(result.current.data?.[0]?.id).toBe(conflictPage.id);
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const noteId = mockNote.id;
		const pageTitle = "Test Page";

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "Database error", code: "PGRST116" },
					}),
				})
				.mockResolvedValueOnce({
					data: null,
					error: { message: "Database error", code: "PGRST116" },
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCheckPageConflict(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, pageTitle });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 除外ページIDの処理
	test("TC-004: Should exclude specified page ID from conflicts", async () => {
		const noteId = mockNote.id;
		const pageTitle = "Test Page";
		const excludePageId = mockPage.id;

		const mockNeq = vi.fn().mockResolvedValue({
			data: [],
			error: null,
		});
		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			neq: mockNeq,
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCheckPageConflict(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, pageTitle, excludePageId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockNeq).toHaveBeenCalledWith("id", excludePageId);
	});
});
