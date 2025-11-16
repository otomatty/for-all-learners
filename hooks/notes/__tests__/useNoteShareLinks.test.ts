/**
 * Tests for useNoteShareLinks hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: エッジケース - 空の結果セット
 * - TC-004: noteIdが空の場合のenabled: false確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useNoteShareLinks } from "../useNoteShareLinks";
import {
	createMockSupabaseClient,
	createWrapper,
	mockShareLink,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useNoteShareLinks", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch share links successfully", async () => {
		const noteId = "note-123";

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockResolvedValue({
						data: [mockShareLink],
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: [mockShareLink],
					error: null,
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useNoteShareLinks(noteId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(1);
		expect(result.current.data?.[0]?.token).toBe(mockShareLink.token);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const noteId = "note-123";

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

		const { result } = renderHook(() => useNoteShareLinks(noteId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: エッジケース - 空の結果セット
	test("TC-003: Should return empty array when no share links exist", async () => {
		const noteId = "note-123";

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

		const { result } = renderHook(() => useNoteShareLinks(noteId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});

	// TC-004: noteIdが空の場合のenabled: false確認
	test("TC-004: Should not fetch when noteId is empty", () => {
		const noteId = "";

		const { result } = renderHook(() => useNoteShareLinks(noteId), {
			wrapper: createWrapper(),
		});

		expect(result.current.isFetching).toBe(false);
		expect(result.current.isLoading).toBe(false);
		expect(mockSupabaseClient.from).not.toHaveBeenCalled();
	});
});
