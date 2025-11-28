/**
 * Tests for useNotes hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - データ取得成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - Repository エラー
 * - TC-004: エッジケース - 空の結果セット
 * - TC-005: 所有ノートと共有ノートの統合
 * - TC-006: 重複ノートの除去
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { notesRepository } from "@/lib/repositories";
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

// Mock NotesRepository
vi.mock("@/lib/repositories", () => ({
	notesRepository: {
		getAll: vi.fn(),
		getById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		getPendingSync: vi.fn(),
		markSynced: vi.fn(),
		syncFromServer: vi.fn(),
		getBySlug: vi.fn(),
		getDefaultNote: vi.fn(),
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

		// Mock Repository.getAll for owned notes
		vi.mocked(notesRepository.getAll).mockResolvedValue(ownedNotes);

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
		expect(notesRepository.getAll).toHaveBeenCalledWith(mockUser.id);
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

	// TC-003: 異常系 - Repository エラー
	test("TC-003: Should handle repository error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock Repository.getAll to throw error
		vi.mocked(notesRepository.getAll).mockRejectedValue(
			new Error("Repository error: DB_ERROR - Database error"),
		);

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

		// Mock Repository.getAll to return empty array
		vi.mocked(notesRepository.getAll).mockResolvedValue([]);

		const mockSharedLinksQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockSharedLinksQuery);

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

		// Mock Repository.getAll for owned notes
		vi.mocked(notesRepository.getAll).mockResolvedValue([ownedNote]);

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
		vi.mocked(notesRepository.getAll).mockResolvedValue([duplicateNote]);

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
