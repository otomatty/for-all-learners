/**
 * PagesRepository テスト
 *
 * DEPENDENCY MAP:
 *
 * Parents: なし（テストファイル）
 *
 * Dependencies:
 *   ├─ lib/repositories/pages-repository.ts
 *   └─ lib/repositories/__tests__/helpers.ts
 *
 * Spec: lib/repositories/pages-repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/196
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatePagePayload, LocalPage } from "@/lib/db/types";
import { PagesRepository } from "../pages-repository";
import {
	createMockDBClient,
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
 * テスト用のモックページを作成
 */
function createMockPage(overrides: Partial<LocalPage> = {}): LocalPage {
	const now = new Date().toISOString();
	return {
		id: overrides.id ?? crypto.randomUUID(),
		user_id: overrides.user_id ?? "test-user-id",
		note_id: overrides.note_id ?? "test-note-id",
		title: overrides.title ?? "Test Page",
		thumbnail_url: overrides.thumbnail_url ?? null,
		is_public: overrides.is_public ?? false,
		scrapbox_page_id: overrides.scrapbox_page_id ?? null,
		scrapbox_page_list_synced_at:
			overrides.scrapbox_page_list_synced_at ?? null,
		scrapbox_page_content_synced_at:
			overrides.scrapbox_page_content_synced_at ?? null,
		created_at: overrides.created_at ?? now,
		updated_at: overrides.updated_at ?? now,
		sync_status: overrides.sync_status ?? "synced",
		synced_at: overrides.synced_at ?? now,
		local_updated_at: overrides.local_updated_at ?? now,
		server_updated_at: overrides.server_updated_at ?? now,
	};
}

/**
 * モックPagesクライアントを追加
 */
function extendMockDBClientWithPages(mockDBClient: MockDBClient) {
	return {
		...mockDBClient,
		pages: {
			getAll: vi.fn(),
			getById: vi.fn(),
			getByNote: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			hardDelete: vi.fn(),
			getPendingSync: vi.fn(),
			getDeleted: vi.fn(),
			markSynced: vi.fn(),
			overwriteWithServer: vi.fn(),
		},
	};
}

describe("PagesRepository", () => {
	let mockDBClient: ReturnType<typeof extendMockDBClientWithPages>;
	let mockSyncManager: MockSyncManager;
	let repository: PagesRepository;

	beforeEach(async () => {
		mockDBClient = extendMockDBClientWithPages(createMockDBClient());
		mockSyncManager = createMockSyncManager();

		// getDBClient のモックを設定
		const { getDBClient } = await import("@/lib/db/hybrid-client");
		vi.mocked(getDBClient).mockResolvedValue(mockDBClient as never);

		// syncManager のモックを設定
		const { syncManager } = await import("@/lib/sync");
		Object.assign(syncManager, mockSyncManager);

		repository = new PagesRepository();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// TC-001, TC-002: getByNoteId
	// ==========================================================================
	describe("getByNoteId", () => {
		it("TC-001: should return pages for note", async () => {
			// Given: 特定のノートに複数のページが存在
			const mockPages = [
				createMockPage({ id: "page-1", note_id: "note-1", title: "Page 1" }),
				createMockPage({ id: "page-2", note_id: "note-1", title: "Page 2" }),
			];
			mockDBClient.pages.getByNote.mockResolvedValue(mockPages);

			// When: getByNoteId(noteId) を実行
			const result = await repository.getByNoteId("note-1");

			// Then: そのノートの全ページが返される
			expect(result).toHaveLength(2);
			expect(mockDBClient.pages.getByNote).toHaveBeenCalledWith("note-1");
		});

		it("TC-002: should return empty array when no pages", async () => {
			// Given: 特定のノートにページが存在しない
			mockDBClient.pages.getByNote.mockResolvedValue([]);

			// When: getByNoteId(noteId) を実行
			const result = await repository.getByNoteId("note-1");

			// Then: 空配列が返される
			expect(result).toEqual([]);
		});
	});

	// ==========================================================================
	// TC-003: updateMetadata
	// ==========================================================================
	describe("updateMetadata", () => {
		it("TC-003: should update only metadata fields", async () => {
			// Given: 既存のページが存在
			const existingPage = createMockPage({
				id: "page-1",
				title: "Original Title",
				sync_status: "synced",
			});
			mockDBClient.pages.getById.mockResolvedValue(existingPage);
			mockDBClient.pages.update.mockResolvedValue({
				...existingPage,
				title: "New Title",
				sync_status: "pending",
			});

			// When: updateMetadata(id, { title: "New Title" }) を実行
			await repository.updateMetadata("page-1", { title: "New Title" });

			// Then: タイトルのみが更新される
			expect(mockDBClient.pages.update).toHaveBeenCalled();
			const updateCall = mockDBClient.pages.update.mock.calls[0];
			expect(updateCall[1].title).toBe("New Title");
		});
	});

	// ==========================================================================
	// TC-004: create
	// ==========================================================================
	describe("create", () => {
		it("TC-004: should create page with correct data", async () => {
			// Given: 新規ページのペイロード
			const payload: CreatePagePayload = {
				title: "New Page",
				note_id: "note-1",
				is_public: false,
			};

			const createdPage = createMockPage({
				title: "New Page",
				note_id: "note-1",
				sync_status: "pending",
			});
			mockDBClient.pages.create.mockResolvedValue(createdPage);

			// When: create(userId, payload) を実行
			await repository.create("user-1", payload);

			// Then: ページが作成され、同期メタデータが設定される
			expect(mockDBClient.pages.create).toHaveBeenCalled();
			const createCall = mockDBClient.pages.create.mock.calls[0];
			const createdEntity = createCall[1];

			expect(createdEntity.title).toBe("New Page");
			expect(createdEntity.note_id).toBe("note-1");
			expect(createdEntity.user_id).toBe("user-1");
			expect(createdEntity.sync_status).toBe("pending");
		});
	});

	// ==========================================================================
	// TC-005: 継承メソッド - getAll
	// ==========================================================================
	describe("getAll (inherited)", () => {
		it("TC-005: should return all pages for user", async () => {
			// Given: ユーザーが複数のページを所有
			const mockPages = [
				createMockPage({ id: "page-1", title: "Page 1", user_id: "user-1" }),
				createMockPage({ id: "page-2", title: "Page 2", user_id: "user-1" }),
			];
			mockDBClient.pages.getAll.mockResolvedValue(mockPages);

			// When: getAll(userId) を実行
			const result = await repository.getAll("user-1");

			// Then: ユーザーの全ページが返される
			expect(result).toHaveLength(2);
			expect(mockDBClient.pages.getAll).toHaveBeenCalledWith("user-1");
		});
	});
});
