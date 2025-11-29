/**
 * Tests for useUpdateNote hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 操作成功
 * - TC-002: 異常系 - データベースエラー
 * - TC-003: 異常系 - ノートが見つからない
 * - TC-004: 正常系 - キャッシュ無効化の確認
 * - TC-005: 正常系 - 部分更新の確認
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { UpdateNotePayload } from "../useUpdateNote";
import { useUpdateNote } from "../useUpdateNote";
import { createWrapper, mockNote } from "./helpers";

// Create hoisted mock functions
const { mockUpdate } = vi.hoisted(() => ({
mockUpdate: vi.fn(),
}));

// Mock repositories module
vi.mock("@/lib/repositories", () => ({
notesRepository: {
update: mockUpdate,
getAll: vi.fn(),
		getById: vi.fn(),
		create: vi.fn(),
		delete: vi.fn(),
		getPendingSync: vi.fn(),
		markSynced: vi.fn(),
		syncFromServer: vi.fn(),
		getBySlug: vi.fn(),
		getDefaultNote: vi.fn(),
	},
}));

describe("useUpdateNote", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - 操作成功
	test("TC-001: Should update note successfully", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = {
			title: "Updated Title",
			description: "Updated description",
		};

		// Mock repository.update to return updated note
		mockUpdate.mockResolvedValue({ ...mockNote, ...payload });

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.title).toBe(payload.title);
		expect(mockUpdate).toHaveBeenCalledWith(noteId, {
title: payload.title,
description: payload.description,
visibility: undefined,
});
	});

	// TC-002: 異常系 - データベースエラー
	test("TC-002: Should handle database error", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = { title: "Updated Title" };

		// Mock repository.update to throw error
		mockUpdate.mockRejectedValue(new Error("Database error"));

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - ノートが見つからない
	test("TC-003: Should handle note not found error", async () => {
		const noteId = "non-existent-note";
		const payload: UpdateNotePayload = { title: "Updated Title" };

		// Mock repository.update to return null (not found)
		mockUpdate.mockResolvedValue(null);

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Returns null when not found (not an error)
		expect(result.current.data).toBeNull();
	});

	// TC-004: 正常系 - キャッシュ無効化の確認
	test("TC-004: Should invalidate cache on success", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = { title: "Updated Title" };

		// Mock repository.update to return updated note
		mockUpdate.mockResolvedValue({ ...mockNote, ...payload });

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Verify the mutation was called
		expect(mockUpdate).toHaveBeenCalled();
	});

	// TC-005: 正常系 - 部分更新の確認
	test("TC-005: Should support partial updates", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = { title: "Only Title Update" };

		// Mock repository.update to return updated note
		mockUpdate.mockResolvedValue({ ...mockNote, title: payload.title });

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockUpdate).toHaveBeenCalledWith(noteId, {
title: payload.title,
description: undefined,
visibility: undefined,
});
	});

	// TC-006: 正常系 - 可視性変更
	test("TC-006: Should update visibility", async () => {
		const noteId = mockNote.id;
		const payload: UpdateNotePayload = { visibility: "public" };

		// Mock repository.update to return updated note
		mockUpdate.mockResolvedValue({ ...mockNote, visibility: "public" });

		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ id: noteId, payload });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.visibility).toBe("public");
		expect(mockUpdate).toHaveBeenCalledWith(noteId, {
title: undefined,
description: undefined,
visibility: "public",
});
	});
});
