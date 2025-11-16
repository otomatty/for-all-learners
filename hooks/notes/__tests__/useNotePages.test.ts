/**
 * Tests for useNotePages hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - データベースエラー
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

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useNotePages", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

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
			limit: 10,
			offset: 0,
			sortBy: "updated" as const,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { id: mockNote.id },
				error: null,
			}),
		};

		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: [
				{
					pages: [mockPage],
					total_count: 1,
				},
			],
			error: null,
		});

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockNoteQuery);

		const { result } = renderHook(() => useNotePages(params), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.pages.length).toBe(1);
		expect(result.current.data?.totalCount).toBe(1);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const slug = "test-note";
		const params = {
			slug,
			limit: 10,
			offset: 0,
			sortBy: "updated" as const,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Note not found", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockNoteQuery);

		const { result } = renderHook(() => useNotePages(params), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: エッジケース - 空の結果セット
	test("TC-003: Should return empty array when no pages exist", async () => {
		const slug = "test-note";
		const params = {
			slug,
			limit: 10,
			offset: 0,
			sortBy: "updated" as const,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { id: mockNote.id },
				error: null,
			}),
		};

		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: [{ pages: [], total_count: 0 }],
			error: null,
		});

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockNoteQuery);

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
			limit: 10,
			offset: 0,
			sortBy: "updated" as const,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockNoteQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({
				data: { id: mockNote.id },
				error: null,
			}),
		};

		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: [{ pages: [mockPage], total_count: 1 }],
			error: null,
		});

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockNoteQuery);

		const { result } = renderHook(() => useNotePages(params), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(mockNoteQuery.eq).toHaveBeenCalledWith("is_default_note", true);
	});
});
