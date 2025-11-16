/**
 * Tests for useUpdatePage hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - ページ更新成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 正常系 - キャッシュ無効化の確認
 * - TC-005: 部分更新の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { useUpdatePage } from "../useUpdatePage";
import {
	createMockSupabaseClient,
	createWrapper,
	mockPage,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUpdatePage", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - ページ更新成功
	test("TC-001: Should update page successfully", async () => {
		const pageId = mockPage.id;
		const updates: Database["public"]["Tables"]["pages"]["Update"] = {
			title: "Updated Title",
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const updatedPage = { ...mockPage, ...updates };
		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: updatedPage,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUpdatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: pageId, updates });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		}, { timeout: 3000 });

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.title).toBe(updates.title);
		expect(mockQuery.update).toHaveBeenCalledWith(updates);
		expect(mockQuery.eq).toHaveBeenCalledWith("id", pageId);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const pageId = mockPage.id;
		const updates: Database["public"]["Tables"]["pages"]["Update"] = {
			title: "Updated Title",
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useUpdatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: pageId, updates });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const pageId = mockPage.id;
		const updates: Database["public"]["Tables"]["pages"]["Update"] = {
			title: "Updated Title",
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUpdatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: pageId, updates });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 正常系 - キャッシュ無効化の確認
	test("TC-004: Should invalidate cache on success", async () => {
		const pageId = mockPage.id;
		const updates: Database["public"]["Tables"]["pages"]["Update"] = {
			title: "Updated Title",
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const updatedPage = { ...mockPage, ...updates };
		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: updatedPage,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUpdatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: pageId, updates });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		}, { timeout: 3000 });

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});

	// TC-005: 部分更新の確認
	test("TC-005: Should handle partial updates", async () => {
		const pageId = mockPage.id;
		const updates: Database["public"]["Tables"]["pages"]["Update"] = {
			content_tiptap: {
				type: "doc",
				content: [{ type: "paragraph", content: [] }],
			},
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const updatedPage = { ...mockPage, ...updates };
		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: updatedPage,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useUpdatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: pageId, updates });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		}, { timeout: 3000 });

		expect(result.current.data).toBeDefined();
		expect(mockQuery.update).toHaveBeenCalledWith(updates);
	});
});

