/**
 * Tests for useNotePages hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - ノートが存在しない場合
 * - TC-003: エッジケース - 空の結果セット
 * - TC-004: デフォルトノートの処理
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useNotePages } from "../useNotePages";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockPage,
	mockUser,
} from "./helpers";

// Mock Supabase client (for RPC calls)
vi.mock("@/lib/supabase/client");

// Create hoisted mock functions
const { mockGetBySlug, mockGetDefaultNote } = vi.hoisted(() => ({
mockGetBySlug: vi.fn(),
	mockGetDefaultNote: vi.fn(),
}));

// Mock repositories module
vi.mock("@/lib/repositories", () => ({
notesRepository: {
getBySlug: mockGetBySlug,
getDefaultNote: mockGetDefaultNote,
getAll: vi.fn(),
		getById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		getPendingSync: vi.fn(),
		markSynced: vi.fn(),
		syncFromServer: vi.fn(),
	},
}));

describe("useNotePages", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;
	const mockUserId = mockUser.id;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch note pages successfully", async () => {
		const slug = "test-note";
		const params = {
			slug,
			userId: mockUserId,
			limit: 10,
			offset: 0,
			sortBy: "updated" as const,
		};

		// Mock repository.getBySlug to return mockNote
		mockGetBySlug.mockResolvedValue(mockNote);

		// Mock RPC call for pages
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
data: [
{
pages: [mockPage],
total_count: 1,
},
],
error: null,
});

		const { result } = renderHook(() => useNotePages(params), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.pages.length).toBe(1);
		expect(result.current.data?.totalCount).toBe(1);
		expect(mockGetBySlug).toHaveBeenCalledWith(mockUserId, slug);
	});

	// TC-002: 異常系 - ノートが存在しない場合
	test("TC-002: Should handle note not found", async () => {
		const slug = "test-note";
		const params = {
			slug,
			userId: mockUserId,
			limit: 10,
			offset: 0,
			sortBy: "updated" as const,
		};

		// Mock repository.getBySlug to return null (not found)
		mockGetBySlug.mockResolvedValue(null);

		const { result } = renderHook(() => useNotePages(params), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toBe("Note not found");
	});

	// TC-003: エッジケース - 空の結果セット
	test("TC-003: Should return empty array when no pages exist", async () => {
		const slug = "test-note";
		const params = {
			slug,
			userId: mockUserId,
			limit: 10,
			offset: 0,
			sortBy: "updated" as const,
		};

		// Mock repository.getBySlug to return mockNote
		mockGetBySlug.mockResolvedValue(mockNote);

		// Mock RPC call returning empty pages
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
data: [{ pages: [], total_count: 0 }],
error: null,
});

		const { result } = renderHook(() => useNotePages(params), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.pages).toEqual([]);
		expect(result.current.data?.totalCount).toBe(0);
	});

	// TC-004: デフォルトノートの処理
	test("TC-004: Should handle default note slug", async () => {
		const slug = "default";
		const params = {
			slug,
			userId: mockUserId,
			limit: 10,
			offset: 0,
			sortBy: "updated" as const,
		};

		// Mock repository.getDefaultNote to return mockNote
		mockGetDefaultNote.mockResolvedValue(mockNote);

		// Mock RPC call for pages
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
data: [{ pages: [mockPage], total_count: 1 }],
error: null,
});

		const { result } = renderHook(() => useNotePages(params), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(mockGetDefaultNote).toHaveBeenCalledWith(mockUserId);
		// getBySlug should NOT be called for default slug
		expect(mockGetBySlug).not.toHaveBeenCalled();
	});
});
