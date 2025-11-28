/**
 * Tests for useDecks hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - Repository エラー
 * - TC-004: エッジケース - 空の結果セット
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { decksRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";
import { useDecks } from "../useDecks";
import {
	createMockSupabaseClient,
	createWrapper,
	mockDeck,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

// Mock DecksRepository
vi.mock("@/lib/repositories", () => ({
	decksRepository: {
		getAll: vi.fn(),
		getById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		getPendingSync: vi.fn(),
		markSynced: vi.fn(),
		syncFromServer: vi.fn(),
	},
	RepositoryError: class RepositoryError extends Error {
		constructor(
			public readonly code: string,
			message?: string,
			public readonly details?: unknown,
		) {
			super(message ?? code);
			this.name = "RepositoryError";
		}
	},
}));

describe("useDecks", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch decks successfully", async () => {
		const decks = [mockDeck];

		// Mock auth.getUser
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock Repository.getAll for decks
		vi.mocked(decksRepository.getAll).mockResolvedValue(decks);

		const { result } = renderHook(() => useDecks(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(1);
		expect(result.current.data?.[0]?.id).toBe(mockDeck.id);
		expect(result.current.data?.[0]?.title).toBe(mockDeck.title);
		expect(decksRepository.getAll).toHaveBeenCalledWith(mockUser.id);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useDecks(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - Repository エラー
	test("TC-003: Should handle repository error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock Repository.getAll to throw error
		vi.mocked(decksRepository.getAll).mockRejectedValue(
			new Error("Repository error: DB_ERROR - Database error"),
		);

		const { result } = renderHook(() => useDecks(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: エッジケース - 空の結果セット
	test("TC-004: Should return empty array when no decks exist", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock Repository.getAll to return empty array
		vi.mocked(decksRepository.getAll).mockResolvedValue([]);

		const { result } = renderHook(() => useDecks(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});
});
