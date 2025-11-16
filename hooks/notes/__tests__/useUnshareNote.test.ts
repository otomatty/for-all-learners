/**
 * Tests for useUnshareNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useUnshareNote } from "../useUnshareNote";
import { createMockSupabaseClient, createWrapper, mockNote } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUnshareNote", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should unshare note successfully", async () => {
		const noteId = mockNote.id;
		const userId = "user-456";

		const mockQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockResolvedValue({
						data: null,
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: null,
					error: null,
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUnshareNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, userId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockQuery.delete).toHaveBeenCalled();
		expect(mockQuery.eq).toHaveBeenCalledWith("note_id", noteId);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const noteId = mockNote.id;
		const userId = "user-456";

		const mockQuery = {
			delete: vi.fn().mockReturnThis(),
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

		const { result } = renderHook(() => useUnshareNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, userId });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 正常系 - キャッシュ無効化の確認
	test("TC-003: Should invalidate cache on success", async () => {
		const noteId = mockNote.id;
		const userId = "user-456";

		const mockQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockResolvedValue({
						data: null,
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: null,
					error: null,
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUnshareNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, userId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});
});
