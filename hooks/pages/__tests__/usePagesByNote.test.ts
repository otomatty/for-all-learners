/**
 * Tests for usePagesByNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - 空の結果セット
 * - TC-005: noteIdが空の場合の動作
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { usePagesByNote } from "../usePagesByNote";
import {
	createMockSupabaseClient,
	createWrapper,
	mockPage,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("usePagesByNote", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch pages by note successfully", async () => {
		const noteId = "note-123";
		// note_page_links returns { pages: Page } format
		const notePageLinks = [{ pages: mockPage }];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: notePageLinks,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => usePagesByNote(noteId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(1);
		expect(result.current.data?.[0]?.id).toBe(mockPage.id);
		expect(mockQuery.eq).toHaveBeenCalledWith("note_id", noteId);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		const noteId = "note-123";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => usePagesByNote(noteId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const noteId = "note-123";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => usePagesByNote(noteId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: エッジケース - 空の結果セット
	test("TC-004: Should return empty array when no pages exist", async () => {
		const noteId = "note-123";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [], // Empty note_page_links array
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => usePagesByNote(noteId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});

	// TC-005: noteIdが空の場合の動作
	test("TC-005: Should not fetch when noteId is empty", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const { result } = renderHook(() => usePagesByNote(""), {
			wrapper: createWrapper(),
		});

		// Query should be disabled when noteId is empty
		expect(result.current.isFetching).toBe(false);
		expect(mockSupabaseClient.from).not.toHaveBeenCalled();
	});
});
