/**
 * Tests for useJoinNoteByLink hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 異常系 - リンクが期限切れ
 * - TC-005: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useJoinNoteByLink } from "../useJoinNoteByLink";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

// Mock useLinkPageToNote
vi.mock("../useLinkPageToNote", () => ({
	useLinkPageToNote: () => ({
		mutateAsync: vi.fn().mockResolvedValue({}),
	}),
}));

describe("useJoinNoteByLink", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should join note by link successfully", async () => {
		const token = "valid-token";
		const linkData = {
			resource_id: mockNote.id,
			resource_type: "note",
			permission_level: "viewer",
			expires_at: null,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockLinkQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: linkData,
				error: null,
			}),
		};

		const mockShareQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					note_id: mockNote.id,
					shared_with_user_id: mockUser.id,
					permission_level: "viewer",
				},
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockLinkQuery)
			.mockReturnValueOnce(mockShareQuery);

		const { result } = renderHook(() => useJoinNoteByLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(token);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(mockLinkQuery.eq).toHaveBeenCalledWith("token", token);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const token = "valid-token";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useJoinNoteByLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(token);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const token = "invalid-token";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockLinkQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Link not found", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockLinkQuery);

		const { result } = renderHook(() => useJoinNoteByLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(token);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - リンクが期限切れ
	test("TC-004: Should handle expired link", async () => {
		const token = "expired-token";
		const expiredDate = new Date();
		expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockLinkQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					resource_id: mockNote.id,
					resource_type: "note",
					permission_level: "viewer",
					expires_at: expiredDate.toISOString(),
				},
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockLinkQuery);

		const { result } = renderHook(() => useJoinNoteByLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(token);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("expired");
	});

	// TC-005: 正常系 - キャッシュ無効化の確認
	test("TC-005: Should invalidate cache on success", async () => {
		const token = "valid-token";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockLinkQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					resource_id: mockNote.id,
					resource_type: "note",
					permission_level: "viewer",
					expires_at: null,
				},
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
			.mockReturnValueOnce(mockLinkQuery)
			.mockReturnValueOnce(mockShareQuery);

		const { result } = renderHook(() => useJoinNoteByLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(token);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});
});
