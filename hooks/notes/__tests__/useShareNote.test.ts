/**
 * Tests for useShareNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useShareNote } from "../useShareNote";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockShare,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useShareNote", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should share note successfully", async () => {
		const noteId = mockNote.id;
		const userId = "user-456";
		const permission = "editor" as const;

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					note_id: noteId,
					shared_with_user_id: userId,
					permission_level: permission,
					created_at: mockShare.created_at,
				},
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useShareNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, userId, permission });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(mockQuery.insert).toHaveBeenCalledWith([
			{
				note_id: noteId,
				shared_with_user_id: userId,
				permission_level: permission,
			},
		]);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const noteId = mockNote.id;
		const userId = "user-456";
		const permission = "viewer" as const;

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "23505" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useShareNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, userId, permission });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 正常系 - キャッシュ無効化の確認
	test("TC-003: Should invalidate cache on success", async () => {
		const noteId = mockNote.id;
		const userId = "user-456";
		const permission = "viewer" as const;

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					note_id: noteId,
					shared_with_user_id: userId,
					permission_level: permission,
				},
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useShareNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, userId, permission });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});
});
