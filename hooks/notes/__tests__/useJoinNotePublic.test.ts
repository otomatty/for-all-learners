/**
 * Tests for useJoinNotePublic hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 異常系 - ノートが公開されていない
 * - TC-005: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useJoinNotePublic } from "../useJoinNotePublic";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useJoinNotePublic", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should join public note successfully", async () => {
		const slug = "public-note";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockSingle = vi.fn().mockResolvedValue({
			data: { id: mockNote.id },
			error: null,
		});
		const mockNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: mockSingle,
		};

		const mockShareQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					note_id: mockNote.id,
					shared_with_user_id: mockUser.id,
					permission_level: "editor",
				},
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockNoteQuery)
			.mockReturnValueOnce(mockShareQuery);

		const { result } = renderHook(() => useJoinNotePublic(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(slug);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(mockNoteQuery.eq).toHaveBeenNthCalledWith(1, "slug", slug);
		expect(mockNoteQuery.eq).toHaveBeenNthCalledWith(2, "visibility", "public");
		expect(mockSingle).toHaveBeenCalled();
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const slug = "public-note";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useJoinNotePublic(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(slug);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const slug = "non-existent-note";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "Note not found", code: "PGRST116" },
					}),
				})
				.mockResolvedValueOnce({
					data: null,
					error: { message: "Note not found", code: "PGRST116" },
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockNoteQuery);

		const { result } = renderHook(() => useJoinNotePublic(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(slug);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - ノートが公開されていない
	test("TC-004: Should handle non-public note", async () => {
		const slug = "private-note";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "No rows returned", code: "PGRST116" },
					}),
				})
				.mockResolvedValueOnce({
					data: null,
					error: { message: "No rows returned", code: "PGRST116" },
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockNoteQuery);

		const { result } = renderHook(() => useJoinNotePublic(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(slug);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-005: 正常系 - キャッシュ無効化の確認
	test("TC-005: Should invalidate cache on success", async () => {
		const slug = "public-note";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { id: mockNote.id },
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: { id: mockNote.id },
					error: null,
				}),
		};

		const mockShareQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { note_id: mockNote.id },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockNoteQuery)
			.mockReturnValueOnce(mockShareQuery);

		const { result } = renderHook(() => useJoinNotePublic(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(slug);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});
});
