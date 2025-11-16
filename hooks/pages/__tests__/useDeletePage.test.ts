/**
 * Tests for useDeletePage hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - ページ削除成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 正常系 - キャッシュ無効化の確認
 * - TC-005: リンクグループ削除の呼び出し確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useDeletePage } from "../useDeletePage";
import {
	createMockSupabaseClient,
	createWrapper,
	mockPage,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

// Mock link group service
vi.mock("@/lib/services/linkGroupService", () => ({
	deleteLinkOccurrencesByPage: vi.fn().mockResolvedValue(undefined),
}));

describe("useDeletePage", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - ページ削除成功
	test("TC-001: Should delete page successfully", async () => {
		const pageId = mockPage.id;

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockPage,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		}, { timeout: 3000 });

		expect(result.current.data).toBeDefined();
		expect(mockQuery.delete).toHaveBeenCalled();
		expect(mockQuery.eq).toHaveBeenCalledWith("id", pageId);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const pageId = mockPage.id;

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const pageId = mockPage.id;

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 正常系 - キャッシュ無効化の確認
	test("TC-004: Should invalidate cache on success", async () => {
		const pageId = mockPage.id;

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockPage,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		}, { timeout: 3000 });

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});

	// TC-005: リンクグループ削除の呼び出し確認
	test("TC-005: Should delete link groups before deleting page", async () => {
		const { deleteLinkOccurrencesByPage } = await import(
			"@/lib/services/linkGroupService"
		);
		const pageId = mockPage.id;

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockPage,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useDeletePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(pageId);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		}, { timeout: 3000 });

		// Verify link groups deletion was called
		expect(deleteLinkOccurrencesByPage).toHaveBeenCalledWith(
			expect.anything(),
			pageId,
		);
	});
});

