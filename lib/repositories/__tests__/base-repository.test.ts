/**
 * BaseRepository テスト
 *
 * DEPENDENCY MAP:
 *
 * Parents: なし（テストファイル）
 *
 * Dependencies:
 *   ├─ lib/repositories/base-repository.ts
 *   ├─ lib/repositories/types.ts
 *   └─ lib/repositories/__tests__/helpers.ts
 *
 * Spec: lib/repositories/repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/195
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateNotePayload, LocalNote } from "@/lib/db/types";
import { BaseRepository, RepositoryError } from "../base-repository";
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

/**
 * テスト用の具象Repositoryクラス
 */
class TestNotesRepository extends BaseRepository<LocalNote> {
	protected entityName = "notes" as const;

	protected createEntity(
		userId: string,
		payload: CreateNotePayload,
	): Omit<
		LocalNote,
		| "id"
		| "sync_status"
		| "synced_at"
		| "local_updated_at"
		| "server_updated_at"
	> {
		const now = new Date().toISOString();
		return {
			owner_id: userId,
			slug: payload.slug,
			title: payload.title,
			description: payload.description ?? null,
			visibility: payload.visibility ?? "private",
			created_at: now,
			updated_at: now,
			page_count: 0,
			participant_count: 1,
			is_default_note: false,
		};
	}
}

describe("BaseRepository", () => {
	let mockDBClient: MockDBClient;
	let mockSyncManager: MockSyncManager;
	let repository: TestNotesRepository;

	beforeEach(async () => {
		mockDBClient = createMockDBClient();
		mockSyncManager = createMockSyncManager();

		// getDBClient のモックを設定
		const { getDBClient } = await import("@/lib/db/hybrid-client");
		vi.mocked(getDBClient).mockResolvedValue(mockDBClient as never);

		// syncManager のモックを設定
		const { syncManager } = await import("@/lib/sync");
		Object.assign(syncManager, mockSyncManager);

		repository = new TestNotesRepository();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// TC-001: getAll - ローカルDBから全データ取得
	// ==========================================================================
	describe("getAll", () => {
		it("TC-001: should return all entities from local DB", async () => {
			// Given: ローカルDBに複数のエンティティが存在
			const mockNotes = [
				createMockNote({ id: "note-1", title: "Note 1" }),
				createMockNote({ id: "note-2", title: "Note 2" }),
			];
			mockDBClient.notes.getAll.mockResolvedValue(mockNotes);

			// When: getAll() を実行
			const result = await repository.getAll("test-user-id");

			// Then: 全エンティティの配列が返される
			expect(result).toHaveLength(2);
			expect(result[0].title).toBe("Note 1");
			expect(result[1].title).toBe("Note 2");
			expect(mockDBClient.notes.getAll).toHaveBeenCalledWith("test-user-id");
		});

		// TC-002: getAll - 空の場合
		it("TC-002: should return empty array when no entities exist", async () => {
			// Given: ローカルDBにエンティティが存在しない
			mockDBClient.notes.getAll.mockResolvedValue([]);

			// When: getAll() を実行
			const result = await repository.getAll("test-user-id");

			// Then: 空の配列が返される
			expect(result).toEqual([]);
		});
	});

	// ==========================================================================
	// TC-003, TC-004: getById
	// ==========================================================================
	describe("getById", () => {
		it("TC-003: should return entity when ID exists", async () => {
			// Given: ローカルDBに特定のエンティティが存在
			const mockNote = createMockNote({ id: "note-1", title: "Test Note" });
			mockDBClient.notes.getById.mockResolvedValue(mockNote);

			// When: getById(id) を実行
			const result = await repository.getById("note-1");

			// Then: 該当エンティティが返される
			expect(result).toEqual(mockNote);
			expect(mockDBClient.notes.getById).toHaveBeenCalledWith("note-1");
		});

		it("TC-004: should return undefined when ID does not exist", async () => {
			// Given: ローカルDBに該当エンティティが存在しない
			mockDBClient.notes.getById.mockResolvedValue(undefined);

			// When: getById(id) を実行
			const result = await repository.getById("non-existent");

			// Then: undefined が返される
			expect(result).toBeUndefined();
		});
	});

	// ==========================================================================
	// TC-005: create - 新規エンティティ作成
	// ==========================================================================
	describe("create", () => {
		it("TC-005: should create entity with correct sync metadata", async () => {
			// Given: 新規エンティティのデータ
			const payload: CreateNotePayload = {
				title: "New Note",
				slug: "new-note",
				description: "Test description",
			};

			const createdNote = createMockNote({
				title: "New Note",
				slug: "new-note",
				sync_status: "pending",
				synced_at: null,
				server_updated_at: null,
			});
			mockDBClient.notes.create.mockResolvedValue(createdNote);

			// When: create(entity) を実行
			await repository.create("test-user-id", payload);

			// Then: 同期メタデータが正しく設定される
			expect(mockDBClient.notes.create).toHaveBeenCalled();
			const createCall = mockDBClient.notes.create.mock.calls[0];
			const createdEntity = createCall[1];

			expect(createdEntity.sync_status).toBe("pending");
			expect(createdEntity.synced_at).toBeNull();
			expect(createdEntity.server_updated_at).toBeNull();
			expect(createdEntity.local_updated_at).toBeDefined();
			expect(createdEntity.id).toBeDefined();
		});

		// TC-015: バックグラウンド同期トリガー
		it("TC-015: should trigger background sync when enabled", async () => {
			// Given: enableBackgroundSync: true のオプション（デフォルト）
			const payload: CreateNotePayload = {
				title: "New Note",
				slug: "new-note",
			};
			mockDBClient.notes.create.mockResolvedValue(
				createMockNote({ sync_status: "pending" }),
			);

			// When: create() を実行
			await repository.create("test-user-id", payload);

			// Then: バックグラウンドで syncManager.sync() が呼ばれる
			expect(mockSyncManager.sync).toHaveBeenCalled();
		});

		// TC-016: バックグラウンド同期無効
		it("TC-016: should not trigger sync when disabled", async () => {
			// Given: enableBackgroundSync: false のオプション
			const repoWithoutSync = new TestNotesRepository({
				enableBackgroundSync: false,
			});

			const payload: CreateNotePayload = {
				title: "New Note",
				slug: "new-note",
			};
			mockDBClient.notes.create.mockResolvedValue(
				createMockNote({ sync_status: "pending" }),
			);

			// When: create() を実行
			await repoWithoutSync.create("test-user-id", payload);

			// Then: syncManager.sync() は呼ばれない
			expect(mockSyncManager.sync).not.toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// TC-006, TC-007: update
	// ==========================================================================
	describe("update", () => {
		it("TC-006: should update entity and set pending status", async () => {
			// Given: ローカルDBに既存エンティティが存在
			const existingNote = createMockNote({
				id: "note-1",
				title: "Original Title",
				sync_status: "synced",
			});
			mockDBClient.notes.getById.mockResolvedValue(existingNote);
			mockDBClient.notes.update.mockResolvedValue({
				...existingNote,
				title: "Updated Title",
				sync_status: "pending",
			});

			// When: update(id, updates) を実行
			await repository.update("note-1", { title: "Updated Title" });

			// Then: 同期メタデータが更新される
			expect(mockDBClient.notes.update).toHaveBeenCalled();
			const updateCall = mockDBClient.notes.update.mock.calls[0];
			const updates = updateCall[1];

			expect(updates.title).toBe("Updated Title");
			expect(updates.sync_status).toBe("pending");
			expect(updates.local_updated_at).toBeDefined();
		});

		it("TC-007: should throw RepositoryError when entity does not exist", async () => {
			// Given: ローカルDBに該当エンティティが存在しない
			mockDBClient.notes.getById.mockResolvedValue(undefined);

			// When/Then: update(id, updates) を実行すると RepositoryError がスローされる
			await expect(
				repository.update("non-existent", { title: "New Title" }),
			).rejects.toThrow(RepositoryError);

			await expect(
				repository.update("non-existent", { title: "New Title" }),
			).rejects.toMatchObject({
				code: "NOT_FOUND",
			});
		});
	});

	// ==========================================================================
	// TC-008, TC-009: delete
	// ==========================================================================
	describe("delete", () => {
		it("TC-008: should soft delete entity", async () => {
			// Given: ローカルDBに既存エンティティが存在
			const existingNote = createMockNote({ id: "note-1" });
			mockDBClient.notes.getById.mockResolvedValue(existingNote);
			mockDBClient.notes.delete.mockResolvedValue(true);

			// When: delete(id) を実行
			const result = await repository.delete("note-1");

			// Then: true が返される
			expect(result).toBe(true);
			expect(mockDBClient.notes.delete).toHaveBeenCalledWith("note-1");
		});

		it("TC-009: should return false when entity does not exist", async () => {
			// Given: ローカルDBに該当エンティティが存在しない
			mockDBClient.notes.getById.mockResolvedValue(undefined);
			mockDBClient.notes.delete.mockResolvedValue(false);

			// When: delete(id) を実行
			const result = await repository.delete("non-existent");

			// Then: false が返される
			expect(result).toBe(false);
		});
	});

	// ==========================================================================
	// TC-010: getPendingSync
	// ==========================================================================
	describe("getPendingSync", () => {
		it("TC-010: should return only pending entities", async () => {
			// Given: ローカルDBに pending と synced のエンティティが混在
			const pendingNotes = [
				createMockNote({ id: "note-1", sync_status: "pending" }),
				createMockNote({ id: "note-2", sync_status: "pending" }),
			];
			mockDBClient.notes.getPendingSync.mockResolvedValue(pendingNotes);

			// When: getPendingSync() を実行
			const result = await repository.getPendingSync();

			// Then: sync_status: 'pending' のエンティティのみ返される
			expect(result).toHaveLength(2);
			expect(result.every((n) => n.sync_status === "pending")).toBe(true);
		});
	});

	// ==========================================================================
	// TC-011: markSynced
	// ==========================================================================
	describe("markSynced", () => {
		it("TC-011: should mark entity as synced", async () => {
			// Given: sync_status: 'pending' のエンティティが存在
			const serverUpdatedAt = new Date().toISOString();
			mockDBClient.notes.markSynced.mockResolvedValue(undefined);

			// When: markSynced(id, serverUpdatedAt) を実行
			await repository.markSynced("note-1", serverUpdatedAt);

			// Then: markSynced が正しい引数で呼ばれる
			expect(mockDBClient.notes.markSynced).toHaveBeenCalledWith(
				"note-1",
				serverUpdatedAt,
			);
		});
	});

	// ==========================================================================
	// TC-012, TC-013, TC-014: syncFromServer
	// ==========================================================================
	describe("syncFromServer", () => {
		it("TC-012: should create new entity from server", async () => {
			// Given: ローカルDBに存在しないエンティティをサーバーから取得
			const serverEntity = createMockNote({
				id: "server-note-1",
				sync_status: "synced",
			});
			mockDBClient.notes.getById.mockResolvedValue(undefined);
			mockDBClient.notes.overwriteWithServer.mockResolvedValue(undefined);

			// When: syncFromServer([entity]) を実行
			await repository.syncFromServer([serverEntity]);

			// Then: 新規エンティティが作成される
			expect(mockDBClient.notes.overwriteWithServer).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "server-note-1",
					sync_status: "synced",
				}),
			);
		});

		it("TC-013: should overwrite synced local entity with server data", async () => {
			// Given: ローカルに sync_status: 'synced' のエンティティが存在
			const localEntity = createMockNote({
				id: "note-1",
				title: "Local Title",
				sync_status: "synced",
			});
			const serverEntity = createMockNote({
				id: "note-1",
				title: "Server Title",
				sync_status: "synced",
			});
			mockDBClient.notes.getById.mockResolvedValue(localEntity);
			mockDBClient.notes.overwriteWithServer.mockResolvedValue(undefined);

			// When: syncFromServer([entity]) を実行
			await repository.syncFromServer([serverEntity]);

			// Then: ローカルエンティティがサーバーの値で上書きされる
			expect(mockDBClient.notes.overwriteWithServer).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Server Title",
				}),
			);
		});

		it("TC-014: should skip pending local entity", async () => {
			// Given: ローカルに sync_status: 'pending' のエンティティが存在
			const localEntity = createMockNote({
				id: "note-1",
				title: "Local Pending Title",
				sync_status: "pending",
			});
			const serverEntity = createMockNote({
				id: "note-1",
				title: "Server Title",
				sync_status: "synced",
			});
			mockDBClient.notes.getById.mockResolvedValue(localEntity);

			// When: syncFromServer([entity]) を実行
			await repository.syncFromServer([serverEntity]);

			// Then: ローカルエンティティは変更されない
			expect(mockDBClient.notes.overwriteWithServer).not.toHaveBeenCalled();
		});
	});
});
