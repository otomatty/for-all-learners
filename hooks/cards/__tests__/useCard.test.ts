/**
 * Tests for useCard hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 異常系 - カードが見つからない
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useCard } from "../useCard";
import {
	createMockSupabaseClient,
	createWrapper,
	mockCard,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useCard", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch card by id successfully", async () => {
		const cardId = "card-123";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockCard,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCard(cardId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.id).toBe(mockCard.id);
		expect(mockQuery.eq).toHaveBeenCalledWith("id", cardId);
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const cardId = "card-123";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCard(cardId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - カードが見つからない
	test("TC-003: Should handle card not found", async () => {
		const cardId = "card-123";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Card not found", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCard(cardId), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});
});
