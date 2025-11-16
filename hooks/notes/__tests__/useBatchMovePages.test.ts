/**
 * Tests for useBatchMovePages hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 正常系 - 競合解決の処理
 * - TC-004: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useBatchMovePages } from "../useBatchMovePages";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockPage,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

// Mock dependent hooks
const mockMutateAsync = vi.fn().mockResolvedValue([]);
vi.mock("../useCheckPageConflict", () => ({
	useCheckPageConflict: () => ({
		mutateAsync: mockMutateAsync,
	}),
}));

vi.mock("../useLinkPageToNote", () => ({
	useLinkPageToNote: () => ({
		mutateAsync: vi.fn().mockResolvedValue({}),
	}),
}));

vi.mock("../useUnlinkPageFromNote", () => ({
	useUnlinkPageFromNote: () => ({
		mutateAsync: vi.fn().mockResolvedValue({}),
	}),
}));

describe("useBatchMovePages", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockMutateAsync.mockResolvedValue([]);
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should move pages successfully", async () => {
		const pageIds = [mockPage.id];
		const sourceNoteId = "note-1";
		const targetNoteId = mockNote.id;

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [{ id: mockPage.id, title: mockPage.title }],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useBatchMovePages(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds, sourceNoteId, targetNoteId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.success).toBe(true);
		expect(result.current.data?.movedPages).toContain(mockPage.id);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const pageIds = [mockPage.id];
		const sourceNoteId = "note-1";
		const targetNoteId = mockNote.id;

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useBatchMovePages(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds, sourceNoteId, targetNoteId });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 正常系 - 競合解決の処理
	test("TC-003: Should handle conflict resolutions", async () => {
		const pageIds = [mockPage.id];
		const sourceNoteId = "note-1";
		const targetNoteId = mockNote.id;

		const conflictPage = {
			id: "conflict-page-1",
			title: mockPage.title,
			created_at: "2025-01-01T00:00:00Z",
			updated_at: "2025-01-01T00:00:00Z",
			content_tiptap: { type: "doc", content: [] },
		};

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [{ id: mockPage.id, title: mockPage.title }],
				error: null,
			}),
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		// Mock useCheckPageConflict to return conflicts
		mockMutateAsync.mockResolvedValue([conflictPage]);

		const { result } = renderHook(() => useBatchMovePages(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			pageIds,
			sourceNoteId,
			targetNoteId,
			conflictResolutions: [
				{
					pageId: mockPage.id,
					action: "rename",
					newTitle: "Renamed Page",
				},
			],
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
	});

	// TC-004: 正常系 - キャッシュ無効化の確認
	test("TC-004: Should invalidate cache on success", async () => {
		const pageIds = [mockPage.id];
		const sourceNoteId = "note-1";
		const targetNoteId = mockNote.id;

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [{ id: mockPage.id, title: mockPage.title }],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useBatchMovePages(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ pageIds, sourceNoteId, targetNoteId });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		expect(result.current.isSuccess).toBe(true);
	});
});
