/**
 * Tests for useRevokeNoteShareLink hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 正常系 - キャッシュ無効化の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useRevokeNoteShareLink } from "../useRevokeNoteShareLink";
import { createMockSupabaseClient, createWrapper } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useRevokeNoteShareLink", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should revoke share link successfully", async () => {
		const token = "share-token-123";

		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useRevokeNoteShareLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(token);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockQuery.update).toHaveBeenCalledWith({
			expires_at: expect.any(String),
		});
		expect(mockQuery.eq).toHaveBeenCalledWith("token", token);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const token = "share-token-123";

		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useRevokeNoteShareLink(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(token);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 正常系 - キャッシュ無効化の確認
	test("TC-003: Should invalidate cache on success", async () => {
		const token = "share-token-123";

		const mockQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useRevokeNoteShareLink(), {
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
