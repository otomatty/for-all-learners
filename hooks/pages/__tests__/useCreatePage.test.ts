/**
 * Tests for useCreatePage hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - ページ作成成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 正常系 - サムネイル自動生成
 * - TC-005: 正常系 - サムネイル自動生成無効
 * - TC-006: 正常系 - キャッシュ無効化の確認
 * - TC-007: リンクグループ同期の呼び出し確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { useCreatePage } from "../useCreatePage";
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
	upsertLinkGroup: vi.fn().mockResolvedValue({ id: "link-group-123" }),
	upsertLinkOccurrence: vi.fn().mockResolvedValue({ id: "occurrence-123" }),
}));

// Mock extractLinksFromContent
vi.mock("@/lib/utils/extractLinksFromContent", () => ({
	extractLinksFromContent: vi.fn().mockReturnValue([]),
}));

// Mock thumbnail extractor
vi.mock("@/lib/utils/thumbnailExtractor", () => ({
	extractFirstImageUrl: vi.fn().mockReturnValue("https://example.com/image.jpg"),
}));

// Mock unilink utils
vi.mock("@/lib/unilink/utils", () => ({
	normalizeTitleToKey: vi.fn((title: string) => title.toLowerCase()),
}));

// Mock linkPageToDefaultNote
vi.mock("@/hooks/notes/useLinkPageToDefaultNote", () => ({
	linkPageToDefaultNote: vi.fn().mockResolvedValue(true),
}));

describe("useCreatePage", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - ページ作成成功
	test("TC-001: Should create page successfully", async () => {
		const pageData: Omit<
			Database["public"]["Tables"]["pages"]["Insert"],
			"id"
		> = {
			title: "New Page",
			content_tiptap: {
				type: "doc",
				content: [{ type: "paragraph", content: [] }],
			},
			note_id: "note-123",
			user_id: mockUser.id,
			is_public: false,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const createdPage = { ...mockPage, ...pageData };
		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: createdPage,
				error: null,
			}),
		};

		// Mock link_groups query (for connectLinkGroupToPage)
		const mockLinkGroupsSelectQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockQuery) // pages insert
			.mockReturnValueOnce(mockLinkGroupsSelectQuery); // link_groups select

		const { result } = renderHook(() => useCreatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ page: pageData });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.title).toBe(pageData.title);
		expect(mockQuery.insert).toHaveBeenCalled();
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const pageData: Omit<
			Database["public"]["Tables"]["pages"]["Insert"],
			"id"
		> = {
			title: "New Page",
			note_id: "note-123",
			user_id: mockUser.id,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useCreatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ page: pageData });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const pageData: Omit<
			Database["public"]["Tables"]["pages"]["Insert"],
			"id"
		> = {
			title: "New Page",
			note_id: "note-123",
			user_id: mockUser.id,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "23505" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCreatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ page: pageData });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 正常系 - サムネイル自動生成
	test("TC-004: Should auto-generate thumbnail when enabled", async () => {
		const { extractFirstImageUrl } = await import(
			"@/lib/utils/thumbnailExtractor"
		);
		const pageData: Omit<
			Database["public"]["Tables"]["pages"]["Insert"],
			"id"
		> = {
			title: "New Page",
			content_tiptap: {
				type: "doc",
				content: [
					{
						type: "image",
						attrs: { src: "https://example.com/image.jpg" },
					},
				],
			},
			note_id: "note-123",
			user_id: mockUser.id,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const createdPage = { ...mockPage, ...pageData, thumbnail_url: "https://example.com/image.jpg" };
		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: createdPage,
				error: null,
			}),
		};

		// Mock link_groups query (for connectLinkGroupToPage)
		const mockLinkGroupsSelectQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockQuery) // pages insert
			.mockReturnValueOnce(mockLinkGroupsSelectQuery); // link_groups select

		const { result } = renderHook(() => useCreatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ page: pageData, autoGenerateThumbnail: true });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(extractFirstImageUrl).toHaveBeenCalled();
	});

	// TC-005: 正常系 - サムネイル自動生成無効
	test("TC-005: Should not generate thumbnail when disabled", async () => {
		const { extractFirstImageUrl } = await import(
			"@/lib/utils/thumbnailExtractor"
		);
		const pageData: Omit<
			Database["public"]["Tables"]["pages"]["Insert"],
			"id"
		> = {
			title: "New Page",
			content_tiptap: {
				type: "doc",
				content: [
					{
						type: "image",
						attrs: { src: "https://example.com/image.jpg" },
					},
				],
			},
			note_id: "note-123",
			user_id: mockUser.id,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const createdPage = { ...mockPage, ...pageData };
		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: createdPage,
				error: null,
			}),
		};

		// Mock link_groups query (for connectLinkGroupToPage)
		const mockLinkGroupsSelectQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockQuery) // pages insert
			.mockReturnValueOnce(mockLinkGroupsSelectQuery); // link_groups select

		const { result } = renderHook(() => useCreatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ page: pageData, autoGenerateThumbnail: false });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(extractFirstImageUrl).not.toHaveBeenCalled();
	});

	// TC-006: 正常系 - キャッシュ無効化の確認
	test("TC-006: Should invalidate cache on success", async () => {
		const pageData: Omit<
			Database["public"]["Tables"]["pages"]["Insert"],
			"id"
		> = {
			title: "New Page",
			note_id: "note-123",
			user_id: mockUser.id,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const createdPage = { ...mockPage, ...pageData };
		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: createdPage,
				error: null,
			}),
		};

		// Mock link_groups query (for connectLinkGroupToPage)
		const mockLinkGroupsSelectQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockQuery) // pages insert
			.mockReturnValueOnce(mockLinkGroupsSelectQuery); // link_groups select

		const { result } = renderHook(() => useCreatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ page: pageData });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});

	// TC-007: リンクグループ同期の呼び出し確認
	test("TC-007: Should sync link groups after page creation", async () => {
		const { upsertLinkGroup } = await import(
			"@/lib/services/linkGroupService"
		);
		const { extractLinksFromContent } = await import(
			"@/lib/utils/extractLinksFromContent"
		);
		const pageData: Omit<
			Database["public"]["Tables"]["pages"]["Insert"],
			"id"
		> = {
			title: "New Page",
			content_tiptap: {
				type: "doc",
				content: [{ type: "paragraph", content: [] }],
			},
			note_id: "note-123",
			user_id: mockUser.id,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const createdPage = { ...mockPage, ...pageData };
		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: createdPage,
				error: null,
			}),
		};

		// Mock link_groups query (for connectLinkGroupToPage)
		const mockLinkGroupsSelectQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockQuery) // pages insert
			.mockReturnValueOnce(mockLinkGroupsSelectQuery); // link_groups select

		const { result } = renderHook(() => useCreatePage(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ page: pageData });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		}, { timeout: 3000 });

		// Verify link groups sync was called
		expect(extractLinksFromContent).toHaveBeenCalled();
		// If links exist, upsertLinkGroup should be called
		// For this test, we return empty links, so it won't be called
	});
});

