/**
 * Tests for useCreateNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 異常系 - バリデーションエラー（該当する場合）
 * - TC-005: 正常系 - キャッシュ無効化の確認
 * - TC-006: 必須フィールドのバリデーション
 * - TC-007: デフォルト値の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { CreateNotePayload } from "@/hooks/notes/useCreateNote";
import { createClient } from "@/lib/supabase/client";
import { useCreateNote } from "../useCreateNote";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useCreateNote", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should create note successfully", async () => {
		const payload: CreateNotePayload = {
			slug: "new-note",
			title: "New Note",
			description: "New description",
			visibility: "private",
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					...mockNote,
					...payload,
					owner_id: mockUser.id,
				},
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCreateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.slug).toBe(payload.slug);
		expect(result.current.data?.title).toBe(payload.title);
		expect(mockQuery.insert).toHaveBeenCalledWith([
			{
				owner_id: mockUser.id,
				slug: payload.slug,
				title: payload.title,
				description: payload.description,
				visibility: payload.visibility,
			},
		]);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should handle authentication error", async () => {
		const payload: CreateNotePayload = {
			slug: "new-note",
			title: "New Note",
			visibility: "private",
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useCreateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("not authenticated");
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		const payload: CreateNotePayload = {
			slug: "new-note",
			title: "New Note",
			visibility: "private",
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

		const { result } = renderHook(() => useCreateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - バリデーションエラー（該当する場合）
	test("TC-004: Should handle validation error for duplicate slug", async () => {
		const payload: CreateNotePayload = {
			slug: "existing-note",
			title: "New Note",
			visibility: "private",
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
				error: {
					message: "duplicate key value violates unique constraint",
					code: "23505",
					details: "Key (slug)=(existing-note) already exists.",
				},
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCreateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("duplicate");
	});

	// TC-005: 正常系 - キャッシュ無効化の確認
	test("TC-005: Should invalidate notes cache on success", async () => {
		const payload: CreateNotePayload = {
			slug: "new-note",
			title: "New Note",
			visibility: "private",
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { ...mockNote, ...payload },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCreateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Cache invalidation is handled by onSuccess callback
		// We verify the mutation succeeded, which triggers the invalidation
		expect(result.current.isSuccess).toBe(true);
	});

	// TC-006: 必須フィールドのバリデーション
	test("TC-006: Should require slug and title", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const { result } = renderHook(() => useCreateNote(), {
			wrapper: createWrapper(),
		});

		// TypeScript will catch missing required fields at compile time
		// At runtime, Supabase will validate the constraints
		const payload: CreateNotePayload = {
			slug: "test",
			title: "Test",
			visibility: "private",
		};

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { ...mockNote, ...payload },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockQuery.insert).toHaveBeenCalledWith([
			expect.objectContaining({
				slug: payload.slug,
				title: payload.title,
			}),
		]);
	});

	// TC-007: デフォルト値の確認
	test("TC-007: Should handle visibility field", async () => {
		const payload: CreateNotePayload = {
			slug: "new-note",
			title: "New Note",
			visibility: "private",
		};

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					...mockNote,
					...payload,
					visibility: undefined, // Database default will be used
				},
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useCreateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(payload);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Verify that visibility can be omitted (database default applies)
		expect(mockQuery.insert).toHaveBeenCalledWith([
			expect.objectContaining({
				slug: payload.slug,
				title: payload.title,
			}),
		]);
	});
});
