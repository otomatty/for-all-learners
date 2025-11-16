/**
 * Tests for useDefaultNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 異常系 - デフォルトノートが存在しない
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useDefaultNote } from "../useDefaultNote";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useDefaultNote", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch default note successfully", async () => {
		const defaultNote = {
			...mockNote,
			is_default_note: true,
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockMaybeSingle = vi.fn().mockResolvedValue({
			data: defaultNote,
			error: null,
		});
		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: mockMaybeSingle,
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useDefaultNote(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.is_default_note).toBe(true);
		expect(mockQuery.eq).toHaveBeenNthCalledWith(1, "owner_id", mockUser.id);
		expect(mockQuery.eq).toHaveBeenNthCalledWith(2, "is_default_note", true);
		expect(mockMaybeSingle).toHaveBeenCalled();
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useDefaultNote(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "Database error", code: "PGRST116" },
					}),
				})
				.mockResolvedValueOnce({
					data: null,
					error: { message: "Database error", code: "PGRST116" },
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useDefaultNote(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - デフォルトノートが存在しない
	test("TC-004: Should throw error when default note not found", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi
				.fn()
				.mockReturnValueOnce({
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: null,
						error: null,
					}),
				})
				.mockResolvedValueOnce({
					data: null,
					error: null,
				}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useDefaultNote(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("Default note not found");
	});
});
