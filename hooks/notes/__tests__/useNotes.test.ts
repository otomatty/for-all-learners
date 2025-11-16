/**
 * Tests for useNotes hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - 空の結果セット
 * - TC-005: 所有ノートと共有ノートの統合
 * - TC-006: 重複ノートの除去
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useNotes } from "../useNotes";
import {
	createMockSupabaseClient,
	createWrapper,
	mockNote,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useNotes", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - データ取得成功
	test("TC-001: Should fetch notes successfully", async () => {
		const ownedNotes = [mockNote];
		const sharedNote = { ...mockNote, id: "note-456", slug: "shared-note" };
		const sharedLinks = [{ note_id: sharedNote.id }];

		// Mock auth.getUser
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock owned notes query
		const mockOwnedQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: ownedNotes.map((n) => ({
					id: n.id,
					slug: n.slug,
					title: n.title,
					description: n.description,
					visibility: n.visibility,
					updated_at: n.updated_at,
					page_count: n.page_count,
					participant_count: n.participant_count,
				})),
				error: null,
			}),
		};

		// Mock shared links query
		const mockSharedLinksQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: sharedLinks,
				error: null,
			}),
		};

		// Mock shared notes query
		const mockSharedNotesQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [
					{
						id: sharedNote.id,
						slug: sharedNote.slug,
						title: sharedNote.title,
						description: sharedNote.description,
						visibility: sharedNote.visibility,
						updated_at: sharedNote.updated_at,
						page_count: sharedNote.page_count,
						participant_count: sharedNote.participant_count,
					},
				],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockOwnedQuery)
			.mockReturnValueOnce(mockSharedLinksQuery)
			.mockReturnValueOnce(mockSharedNotesQuery);

		const { result } = renderHook(() => useNotes(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(2);
		expect(result.current.data?.some((n) => n.id === mockNote.id)).toBe(true);
		expect(result.current.data?.some((n) => n.id === sharedNote.id)).toBe(true);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useNotes(), {
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

		const mockOwnedQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error", code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockOwnedQuery);

		const { result } = renderHook(() => useNotes(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: エッジケース - 空の結果セット
	test("TC-004: Should return empty array when no notes exist", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockOwnedQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		const mockSharedLinksQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockOwnedQuery)
			.mockReturnValueOnce(mockSharedLinksQuery);

		const { result } = renderHook(() => useNotes(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});

	// TC-005: 所有ノートと共有ノートの統合
	test("TC-005: Should combine owned and shared notes", async () => {
		const ownedNote = { ...mockNote, id: "note-1" };
		const sharedNote = { ...mockNote, id: "note-2", slug: "shared-note" };
		const sharedLinks = [{ note_id: sharedNote.id }];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockOwnedQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [
					{
						id: ownedNote.id,
						slug: ownedNote.slug,
						title: ownedNote.title,
						description: ownedNote.description,
						visibility: ownedNote.visibility,
						updated_at: ownedNote.updated_at,
						page_count: ownedNote.page_count,
						participant_count: ownedNote.participant_count,
					},
				],
				error: null,
			}),
		};

		const mockSharedLinksQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: sharedLinks,
				error: null,
			}),
		};

		const mockSharedNotesQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [
					{
						id: sharedNote.id,
						slug: sharedNote.slug,
						title: sharedNote.title,
						description: sharedNote.description,
						visibility: sharedNote.visibility,
						updated_at: sharedNote.updated_at,
						page_count: sharedNote.page_count,
						participant_count: sharedNote.participant_count,
					},
				],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockOwnedQuery)
			.mockReturnValueOnce(mockSharedLinksQuery)
			.mockReturnValueOnce(mockSharedNotesQuery);

		const { result } = renderHook(() => useNotes(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.length).toBe(2);
		expect(
			result.current.data?.find((n) => n.id === ownedNote.id),
		).toBeDefined();
		expect(
			result.current.data?.find((n) => n.id === sharedNote.id),
		).toBeDefined();
	});

	// TC-006: 重複ノートの除去
	test("TC-006: Should remove duplicate notes", async () => {
		const duplicateNote = { ...mockNote, id: "note-duplicate" };
		const sharedLinks = [{ note_id: duplicateNote.id }];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Same note appears in both owned and shared
		const mockOwnedQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [
					{
						id: duplicateNote.id,
						slug: duplicateNote.slug,
						title: duplicateNote.title,
						description: duplicateNote.description,
						visibility: duplicateNote.visibility,
						updated_at: duplicateNote.updated_at,
						page_count: duplicateNote.page_count,
						participant_count: duplicateNote.participant_count,
					},
				],
				error: null,
			}),
		};

		const mockSharedLinksQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: sharedLinks,
				error: null,
			}),
		};

		const mockSharedNotesQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				data: [
					{
						id: duplicateNote.id,
						slug: duplicateNote.slug,
						title: duplicateNote.title,
						description: duplicateNote.description,
						visibility: duplicateNote.visibility,
						updated_at: duplicateNote.updated_at,
						page_count: duplicateNote.page_count,
						participant_count: duplicateNote.participant_count,
					},
				],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockOwnedQuery)
			.mockReturnValueOnce(mockSharedLinksQuery)
			.mockReturnValueOnce(mockSharedNotesQuery);

		const { result } = renderHook(() => useNotes(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Should only have one instance of the note
		expect(result.current.data?.length).toBe(1);
		expect(result.current.data?.[0]?.id).toBe(duplicateNote.id);
	});
});
