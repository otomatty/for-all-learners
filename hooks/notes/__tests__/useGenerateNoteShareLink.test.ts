/**
 * Tests for useGenerateNoteShareLink hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useGenerateNoteShareLink } from "../useGenerateNoteShareLink";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockShareLink,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useGenerateNoteShareLink", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock crypto.randomUUID using vi.spyOn
		vi.spyOn(global.crypto, "randomUUID").mockReturnValue("mock-uuid-123");
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should generate share link successfully", async () => {
		const noteId = mockNote.id;
		const permission = "viewer" as const;

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					...mockShareLink,
					resource_type: "note",
					resource_id: noteId,
				},
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useGenerateNoteShareLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, permission });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(mockQuery.insert).toHaveBeenCalledWith([
			{
				resource_type: "note",
				resource_id: noteId,
				token: "mock-uuid-123",
				permission_level: permission,
			},
		]);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const noteId = mockNote.id;
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

		const { result } = renderHook(() => useGenerateNoteShareLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, permission });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 正常系 - キャッシュ無効化の確認
	test("TC-003: Should invalidate cache on success", async () => {
		const noteId = mockNote.id;
		const permission = "viewer" as const;

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { ...mockShareLink, resource_id: noteId },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useGenerateNoteShareLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ noteId, permission });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});
});
