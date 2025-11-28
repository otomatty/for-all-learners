/**
 * DecksRepository テスト
 *
 * DEPENDENCY MAP:
 *
 * Parents: なし（テストファイル）
 *
 * Dependencies:
 *   ├─ lib/repositories/decks-repository.ts
 *   └─ lib/repositories/__tests__/helpers.ts
 *
 * Spec: lib/repositories/decks-repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/197
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateDeckPayload, LocalDeck } from "@/lib/db/types";
import { DecksRepository } from "../decks-repository";
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
 * テスト用のモックデッキを作成
 */
function createMockDeck(overrides: Partial<LocalDeck> = {}): LocalDeck {
	const now = new Date().toISOString();
	return {
		id: overrides.id ?? crypto.randomUUID(),
		user_id: overrides.user_id ?? "test-user-id",
		title: overrides.title ?? "Test Deck",
		description: overrides.description ?? null,
		is_public: overrides.is_public ?? false,
		created_at: overrides.created_at ?? now,
		updated_at: overrides.updated_at ?? now,
		sync_status: overrides.sync_status ?? "synced",
		synced_at: overrides.synced_at ?? now,
		local_updated_at: overrides.local_updated_at ?? now,
		server_updated_at: overrides.server_updated_at ?? now,
	};
}

/**
 * モックDecksクライアントを追加
 */
function extendMockDBClientWithDecks(mockDBClient: MockDBClient) {
	return {
		...mockDBClient,
		decks: {
			getAll: vi.fn(),
			getById: vi.fn(),
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

describe("DecksRepository", () => {
	let mockDBClient: ReturnType<typeof extendMockDBClientWithDecks>;
	let mockSyncManager: MockSyncManager;
	let repository: DecksRepository;

	beforeEach(async () => {
		mockDBClient = extendMockDBClientWithDecks(createMockDBClient());
		mockSyncManager = createMockSyncManager();

		// getDBClient のモックを設定
		const { getDBClient } = await import("@/lib/db/hybrid-client");
		vi.mocked(getDBClient).mockResolvedValue(mockDBClient as never);

		// syncManager のモックを設定
		const { syncManager } = await import("@/lib/sync");
		Object.assign(syncManager, mockSyncManager);

		repository = new DecksRepository();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// TC-001: create
	// ==========================================================================
	describe("create", () => {
		it("TC-001: should create deck with correct data", async () => {
			// Given: 新規デッキのペイロード
			const payload: CreateDeckPayload = {
				title: "New Deck",
				description: "Test description",
				is_public: false,
			};

			const createdDeck = createMockDeck({
				title: "New Deck",
				sync_status: "pending",
			});
			mockDBClient.decks.create.mockResolvedValue(createdDeck);

			// When: create(userId, payload) を実行
			await repository.create("user-1", payload);

			// Then: デッキが作成され、同期メタデータが設定される
			expect(mockDBClient.decks.create).toHaveBeenCalled();
			const createCall = mockDBClient.decks.create.mock.calls[0];
			const createdEntity = createCall[1];

			expect(createdEntity.title).toBe("New Deck");
			expect(createdEntity.user_id).toBe("user-1");
			expect(createdEntity.sync_status).toBe("pending");
		});
	});

	// ==========================================================================
	// TC-002: 継承メソッド - getAll
	// ==========================================================================
	describe("getAll (inherited)", () => {
		it("TC-002: should return all decks for user", async () => {
			// Given: ユーザーが複数のデッキを所有
			const mockDecks = [
				createMockDeck({ id: "deck-1", title: "Deck 1", user_id: "user-1" }),
				createMockDeck({ id: "deck-2", title: "Deck 2", user_id: "user-1" }),
			];
			mockDBClient.decks.getAll.mockResolvedValue(mockDecks);

			// When: getAll(userId) を実行
			const result = await repository.getAll("user-1");

			// Then: ユーザーの全デッキが返される
			expect(result).toHaveLength(2);
			expect(mockDBClient.decks.getAll).toHaveBeenCalledWith("user-1");
		});
	});

	// ==========================================================================
	// TC-003: 継承メソッド - update
	// ==========================================================================
	describe("update (inherited)", () => {
		it("TC-003: should update deck", async () => {
			// Given: 既存のデッキが存在
			const existingDeck = createMockDeck({
				id: "deck-1",
				title: "Original Title",
				sync_status: "synced",
			});
			mockDBClient.decks.getById.mockResolvedValue(existingDeck);
			mockDBClient.decks.update.mockResolvedValue({
				...existingDeck,
				title: "Updated Title",
				sync_status: "pending",
			});

			// When: update(id, updates) を実行
			await repository.update("deck-1", { title: "Updated Title" });

			// Then: デッキが更新される
			expect(mockDBClient.decks.update).toHaveBeenCalled();
			const updateCall = mockDBClient.decks.update.mock.calls[0];
			expect(updateCall[1].title).toBe("Updated Title");
		});
	});
});
