/**
 * Tests for usePageBacklinks hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - バックリンク取得成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - バックリンクなし
 * - TC-005: pageIdが空の場合の動作
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { usePageBacklinks } from "../usePageBacklinks";
import {
	createMockSupabaseClient,
	createWrapper,
	mockBacklinkPage,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("usePageBacklinks", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - バックリンク取得成功
	test("TC-001: Should fetch backlinks successfully", async () => {
		const targetPageId = "page-123";
		const backlinks = [mockBacklinkPage];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const backlinkPageWithContent = {
			...mockBacklinkPage,
			content_tiptap: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								marks: [
									{
										type: "unilink",
										attrs: { pageId: targetPageId },
									},
								],
								text: "Link text",
							},
						],
					},
				],
			},
		};

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			neq: vi.fn().mockResolvedValue({
				data: [backlinkPageWithContent],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => usePageBacklinks(targetPageId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.data).toBeDefined();
		expect(result.current.data?.data?.length).toBeGreaterThan(0);
		expect(mockQuery.neq).toHaveBeenCalledWith("id", targetPageId);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should return error when user is not authenticated", async () => {
		const targetPageId = "page-123";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => usePageBacklinks(targetPageId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		}, { timeout: 3000 });

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.error).toBe("予期しないエラーが発生しました");
		expect(result.current.data?.data).toBeNull();
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const targetPageId = "page-123";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			neq: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => usePageBacklinks(targetPageId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		}, { timeout: 3000 });

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.error).toBe("ページの取得に失敗しました");
		expect(result.current.data?.data).toBeNull();
	});

	// TC-004: エッジケース - バックリンクなし
	test("TC-004: Should return empty array when no backlinks exist", async () => {
		const targetPageId = "page-123";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			neq: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => usePageBacklinks(targetPageId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.data).toEqual([]);
		expect(result.current.data?.error).toBeNull();
	});

	// TC-005: pageIdが空の場合の動作
	test("TC-005: Should not fetch when pageId is empty", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const { result } = renderHook(() => usePageBacklinks(""), {
			wrapper: createWrapper(),
		});

		// Query should be disabled when pageId is empty
		expect(result.current.isFetching).toBe(false);
		expect(mockSupabaseClient.from).not.toHaveBeenCalled();
	});
});

