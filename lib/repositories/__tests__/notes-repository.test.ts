/**
 * NotesRepository テスト
 *
 * DEPENDENCY MAP:
 *
 * Parents: なし（テストファイル）
 *
 * Dependencies:
 *   ├─ lib/repositories/notes-repository.ts
 *   └─ lib/repositories/__tests__/helpers.ts
 *
 * Spec: lib/repositories/notes-repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/196
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateNotePayload } from "@/lib/db/types";
import { NotesRepository } from "../notes-repository";
import {
	createMockDBClient,
	createMockNote,
	createMockSyncManager,
	type MockDBClient,
	type MockSyncManager,
} from "./helpers";

// モックを設定
vi.mock("@/lib/db/hybrid-client", () => ({
	getDBClient: vi.fn(),
}));

vi.mock("@/lib/sync", () => ({
	syncManager: {
		sync: vi.fn(),
		getState: vi.fn(),
	},
}));

describe("NotesRepository", () => {
	let mockDBClient: MockDBClient;
	let mockSyncManager: MockSyncManager;
	let repository: NotesRepository;

	beforeEach(async () => {
		mockDBClient = createMockDBClient();
		mockSyncManager = createMockSyncManager();

		// getDBClient のモックを設定
		const { getDBClient } = await import("@/lib/db/hybrid-client");
		vi.mocked(getDBClient).mockResolvedValue(mockDBClient as never);

		// syncManager のモックを設定
		const { syncManager } = await import("@/lib/sync");
		Object.assign(syncManager, mockSyncManager);

		repository = new NotesRepository();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// TC-001, TC-002: getBySlug
	// ==========================================================================
	describe("getBySlug", () => {
		it("TC-001: should return note when slug exists", async () => {
			// Given: ローカルDBに特定のスラッグのノートが存在
			const mockNotes = [
				createMockNote({ id: "note-1", slug: "my-note", owner_id: "user-1" }),
				createMockNote({
					id: "note-2",
					slug: "other-note",
					owner_id: "user-1",
				}),
			];
			mockDBClient.notes.getAll.mockResolvedValue(mockNotes);

			// When: getBySlug(userId, slug) を実行
			const result = await repository.getBySlug("user-1", "my-note");

			// Then: 該当ノートが返される
			expect(result).toBeDefined();
			expect(result?.slug).toBe("my-note");
			expect(result?.id).toBe("note-1");
		});

		it("TC-002: should return undefined when slug does not exist", async () => {
			// Given: ローカルDBに該当スラッグのノートが存在しない
			const mockNotes = [
				createMockNote({
					id: "note-1",
					slug: "existing-note",
					owner_id: "user-1",
				}),
			];
			mockDBClient.notes.getAll.mockResolvedValue(mockNotes);

			// When: getBySlug(userId, slug) を実行
			const result = await repository.getBySlug("user-1", "non-existent");

			// Then: undefined が返される
			expect(result).toBeUndefined();
		});
	});

	// ==========================================================================
	// TC-003, TC-004: getDefaultNote
	// ==========================================================================
	describe("getDefaultNote", () => {
		it("TC-003: should return default note when exists", async () => {
			// Given: ユーザーのデフォルトノート（is_default_note: true）が存在
			const mockNotes = [
				createMockNote({
					id: "note-1",
					is_default_note: false,
					owner_id: "user-1",
				}),
				createMockNote({
					id: "note-2",
					is_default_note: true,
					owner_id: "user-1",
				}),
			];
			mockDBClient.notes.getAll.mockResolvedValue(mockNotes);

			// When: getDefaultNote(userId) を実行
			const result = await repository.getDefaultNote("user-1");

			// Then: デフォルトノートが返される
			expect(result).toBeDefined();
			expect(result?.id).toBe("note-2");
			expect(result?.is_default_note).toBe(true);
		});

		it("TC-004: should return undefined when no default note", async () => {
			// Given: ユーザーのデフォルトノートが存在しない
			const mockNotes = [
				createMockNote({
					id: "note-1",
					is_default_note: false,
					owner_id: "user-1",
				}),
				createMockNote({
					id: "note-2",
					is_default_note: null,
					owner_id: "user-1",
				}),
			];
			mockDBClient.notes.getAll.mockResolvedValue(mockNotes);

			// When: getDefaultNote(userId) を実行
			const result = await repository.getDefaultNote("user-1");

			// Then: undefined が返される
			expect(result).toBeUndefined();
		});
	});

	// ==========================================================================
	// TC-005: create
	// ==========================================================================
	describe("create", () => {
		it("TC-005: should create note with correct data", async () => {
			// Given: 新規ノートのペイロード
			const payload: CreateNotePayload = {
				title: "New Note",
				slug: "new-note",
				description: "Test description",
				visibility: "private",
			};

			const createdNote = createMockNote({
				title: "New Note",
				slug: "new-note",
				sync_status: "pending",
			});
			mockDBClient.notes.create.mockResolvedValue(createdNote);

			// When: create(userId, payload) を実行
			await repository.create("user-1", payload);

			// Then: ノートが作成され、同期メタデータが設定される
			expect(mockDBClient.notes.create).toHaveBeenCalled();
			const createCall = mockDBClient.notes.create.mock.calls[0];
			const createdEntity = createCall[1];

			expect(createdEntity.title).toBe("New Note");
			expect(createdEntity.slug).toBe("new-note");
			expect(createdEntity.owner_id).toBe("user-1");
			expect(createdEntity.sync_status).toBe("pending");
		});
	});

	// ==========================================================================
	// TC-006: 継承メソッド - getAll
	// ==========================================================================
	describe("getAll (inherited)", () => {
		it("TC-006: should return all notes for user", async () => {
			// Given: ユーザーが複数のノートを所有
			const mockNotes = [
				createMockNote({ id: "note-1", title: "Note 1", owner_id: "user-1" }),
				createMockNote({ id: "note-2", title: "Note 2", owner_id: "user-1" }),
			];
			mockDBClient.notes.getAll.mockResolvedValue(mockNotes);

			// When: getAll(userId) を実行
			const result = await repository.getAll("user-1");

			// Then: ユーザーの全ノートが返される
			expect(result).toHaveLength(2);
			expect(mockDBClient.notes.getAll).toHaveBeenCalledWith("user-1");
		});
	});
});
