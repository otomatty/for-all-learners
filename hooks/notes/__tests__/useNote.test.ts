/**
 * Tests for useNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 異常系 - データが存在しない場合
 * - TC-005: エッジケース - slugが空の場合のenabled: false確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useNote } from "../useNote";
import { createMockSupabaseClient, createWrapper, mockNote } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useNote", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch note successfully", async () => {
		const slug = "test-note";

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					id: mockNote.id,
					slug: mockNote.slug,
					title: mockNote.title,
					description: mockNote.description,
					visibility: mockNote.visibility,
					created_at: mockNote.created_at,
					updated_at: mockNote.updated_at,
					page_count: mockNote.page_count,
					participant_count: mockNote.participant_count,
					owner_id: mockNote.owner_id,
					is_default_note: mockNote.is_default_note,
				},
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useNote(slug), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.note.id).toBe(mockNote.id);
		expect(result.current.data?.note.slug).toBe(slug);
		expect(mockSupabaseClient.from).toHaveBeenCalledWith("notes");
		expect(mockQuery.eq).toHaveBeenCalledWith("slug", slug);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const slug = "test-note";

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Not authenticated", code: "PGRST301" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useNote(slug), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const slug = "test-note";

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useNote(slug), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - データが存在しない場合
	test("TC-004: Should handle note not found", async () => {
		const slug = "non-existent-note";

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "No rows returned", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useNote(slug), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("No rows returned");
	});

	// TC-005: エッジケース - slugが空の場合のenabled: false確認
	test("TC-005: Should not fetch when slug is empty", () => {
		const slug = "";

		const { result } = renderHook(() => useNote(slug), {
			wrapper: createWrapper(),
		});

		// Query should be disabled when slug is empty
		expect(result.current.isFetching).toBe(false);
		expect(result.current.isLoading).toBe(false);
		expect(mockSupabaseClient.from).not.toHaveBeenCalled();
	});

	test("TC-005: Should not fetch when slug is undefined", () => {
		const slug = undefined as unknown as string;

		const { result } = renderHook(() => useNote(slug), {
			wrapper: createWrapper(),
		});

		// Query should be disabled when slug is undefined
		expect(result.current.isFetching).toBe(false);
		expect(result.current.isLoading).toBe(false);
		expect(mockSupabaseClient.from).not.toHaveBeenCalled();
	});
});
