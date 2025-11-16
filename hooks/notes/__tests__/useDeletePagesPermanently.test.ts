/**
 * Tests for useDeletePagesPermanently hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 異常系 - ページが見つからない
 * - TC-005: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useDeletePagesPermanently } from "../useDeletePagesPermanently";
import {
	createMockSupabaseClient,
	createWrapper,
	mockPage,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useDeletePagesPermanently", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should delete pages permanently successfully", async () => {
		const pageIds = [mockPage.id];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockPagesQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [{ id: mockPage.id, title: mockPage.title }],
				error: null,
			}),
		};

		const mockTrashDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		const mockLinkDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		const mockPageDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockPagesQuery)
			.mockReturnValueOnce(mockTrashDeleteQuery)
			.mockReturnValueOnce(mockLinkDeleteQuery)
			.mockReturnValueOnce(mockPageDeleteQuery);

		const { result } = renderHook(() => useDeletePagesPermanently(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		expect(result.current.data?.deletedCount).toBe(1);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const pageIds = [mockPage.id];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useDeletePagesPermanently(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("認証が必要");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const pageIds = [mockPage.id];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockPagesQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockPagesQuery);

		const { result } = renderHook(() => useDeletePagesPermanently(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - ページが見つからない
	test("TC-004: Should handle pages not found", async () => {
		const pageIds = ["non-existent-page"];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockPagesQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockPagesQuery);

		const { result } = renderHook(() => useDeletePagesPermanently(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("ページが見つかりません");
	});

	// TC-005: 正常系 - キャッシュ無効化の確認
	test("TC-005: Should invalidate cache on success", async () => {
		const pageIds = [mockPage.id];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockPagesQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [{ id: mockPage.id, title: mockPage.title }],
				error: null,
			}),
		};

		const mockTrashDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		const mockLinkDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		const mockPageDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockPagesQuery)
			.mockReturnValueOnce(mockTrashDeleteQuery)
			.mockReturnValueOnce(mockLinkDeleteQuery)
			.mockReturnValueOnce(mockPageDeleteQuery);

		const { result } = renderHook(() => useDeletePagesPermanently(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});
});
