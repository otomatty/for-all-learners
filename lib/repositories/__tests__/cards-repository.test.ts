/**
 * CardsRepository テスト
 *
 * DEPENDENCY MAP:
 *
 * Parents: なし（テストファイル）
 *
 * Dependencies:
 *   ├─ lib/repositories/cards-repository.ts
 *   └─ lib/repositories/__tests__/helpers.ts
 *
 * Spec: lib/repositories/cards-repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/197
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	CreateCardPayload,
	LocalCard,
	TiptapContent,
} from "@/lib/db/types";
import { CardsRepository } from "../cards-repository";
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
 * テスト用のTiptapContentを作成
 */
function createTiptapContent(text: string): TiptapContent {
	return {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [{ type: "text", text }],
			},
		],
	};
}

/**
 * テスト用のモックカードを作成
 */
function createMockCard(overrides: Partial<LocalCard> = {}): LocalCard {
	const now = new Date().toISOString();
	return {
		id: overrides.id ?? crypto.randomUUID(),
		deck_id: overrides.deck_id ?? "test-deck-id",
		user_id: overrides.user_id ?? "test-user-id",
		front_content: overrides.front_content ?? createTiptapContent("Front"),
		back_content: overrides.back_content ?? createTiptapContent("Back"),
		source_audio_url: overrides.source_audio_url ?? null,
		source_ocr_image_url: overrides.source_ocr_image_url ?? null,
		created_at: overrides.created_at ?? now,
		updated_at: overrides.updated_at ?? now,
		ease_factor: overrides.ease_factor ?? 2.5,
		repetition_count: overrides.repetition_count ?? 0,
		review_interval: overrides.review_interval ?? 0,
		next_review_at: overrides.next_review_at ?? null,
		stability: overrides.stability ?? 0,
		difficulty: overrides.difficulty ?? 0,
		last_reviewed_at: overrides.last_reviewed_at ?? null,
		sync_status: overrides.sync_status ?? "synced",
		synced_at: overrides.synced_at ?? now,
		local_updated_at: overrides.local_updated_at ?? now,
		server_updated_at: overrides.server_updated_at ?? now,
	};
}

/**
 * モックCardsクライアントを追加
 */
function extendMockDBClientWithCards(mockDBClient: MockDBClient) {
	return {
		...mockDBClient,
		cards: {
			getAll: vi.fn(),
			getById: vi.fn(),
			getByDeck: vi.fn(),
			getDueCards: vi.fn(),
			create: vi.fn(),
			createMany: vi.fn(),
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

describe("CardsRepository", () => {
	let mockDBClient: ReturnType<typeof extendMockDBClientWithCards>;
	let mockSyncManager: MockSyncManager;
	let repository: CardsRepository;

	beforeEach(async () => {
		mockDBClient = extendMockDBClientWithCards(createMockDBClient());
		mockSyncManager = createMockSyncManager();

		// getDBClient のモックを設定
		const { getDBClient } = await import("@/lib/db/hybrid-client");
		vi.mocked(getDBClient).mockResolvedValue(mockDBClient as never);

		// syncManager のモックを設定
		const { syncManager } = await import("@/lib/sync");
		Object.assign(syncManager, mockSyncManager);

		repository = new CardsRepository();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// TC-001: getByDeckId
	// ==========================================================================
	describe("getByDeckId", () => {
		it("TC-001: should return cards for deck", async () => {
			// Given: 特定のデッキに複数のカードが存在
			const mockCards = [
				createMockCard({ id: "card-1", deck_id: "deck-1" }),
				createMockCard({ id: "card-2", deck_id: "deck-1" }),
			];
			mockDBClient.cards.getByDeck.mockResolvedValue(mockCards);

			// When: getByDeckId(deckId) を実行
			const result = await repository.getByDeckId("deck-1");

			// Then: そのデッキの全カードが返される
			expect(result).toHaveLength(2);
			expect(mockDBClient.cards.getByDeck).toHaveBeenCalledWith("deck-1");
		});
	});

	// ==========================================================================
	// TC-002: getDueCards
	// ==========================================================================
	describe("getDueCards", () => {
		it("TC-002: should return due cards", async () => {
			// Given: ユーザーに期限切れのカードが存在
			const dueCards = [
				createMockCard({
					id: "card-1",
					next_review_at: "2020-01-01T00:00:00Z",
				}),
			];
			mockDBClient.cards.getDueCards.mockResolvedValue(dueCards);

			// When: getDueCards(userId) を実行
			const result = await repository.getDueCards("user-1");

			// Then: 復習対象のカードのみ返される
			expect(result).toHaveLength(1);
			expect(mockDBClient.cards.getDueCards).toHaveBeenCalledWith("user-1");
		});
	});

	// ==========================================================================
	// TC-003: updateReviewResult
	// ==========================================================================
	describe("updateReviewResult", () => {
		it("TC-003: should update FSRS fields", async () => {
			// Given: 既存のカードが存在
			const existingCard = createMockCard({
				id: "card-1",
				ease_factor: 2.5,
				sync_status: "synced",
			});
			mockDBClient.cards.getById.mockResolvedValue(existingCard);
			mockDBClient.cards.update.mockResolvedValue({
				...existingCard,
				ease_factor: 2.7,
				repetition_count: 1,
				sync_status: "pending",
			});

			// When: updateReviewResult(id, result) を実行
			await repository.updateReviewResult("card-1", {
				ease_factor: 2.7,
				repetition_count: 1,
				review_interval: 1,
				next_review_at: "2025-12-01T00:00:00Z",
				stability: 1.5,
				difficulty: 0.3,
				last_reviewed_at: new Date().toISOString(),
			});

			// Then: FSRS関連フィールドが更新される
			expect(mockDBClient.cards.update).toHaveBeenCalled();
			const updateCall = mockDBClient.cards.update.mock.calls[0];
			expect(updateCall[1].ease_factor).toBe(2.7);
			expect(updateCall[1].repetition_count).toBe(1);
		});
	});

	// ==========================================================================
	// TC-004: createBatch
	// ==========================================================================
	describe("createBatch", () => {
		it("TC-004: should create multiple cards", async () => {
			// Given: 複数のカードペイロード
			const payloads: CreateCardPayload[] = [
				{
					deck_id: "deck-1",
					front_content: createTiptapContent("Front 1"),
					back_content: createTiptapContent("Back 1"),
				},
				{
					deck_id: "deck-1",
					front_content: createTiptapContent("Front 2"),
					back_content: createTiptapContent("Back 2"),
				},
			];

			const createdCards = payloads.map((p, i) =>
				createMockCard({ id: `card-${i}`, ...p, sync_status: "pending" }),
			);
			mockDBClient.cards.createMany.mockResolvedValue(createdCards);

			// When: createBatch(userId, payloads) を実行
			const result = await repository.createBatch("user-1", payloads);

			// Then: 全カードが作成される
			expect(result).toHaveLength(2);
			expect(mockDBClient.cards.createMany).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// TC-005: create
	// ==========================================================================
	describe("create", () => {
		it("TC-005: should create card with FSRS defaults", async () => {
			// Given: 新規カードのペイロード
			const payload: CreateCardPayload = {
				deck_id: "deck-1",
				front_content: createTiptapContent("Front"),
				back_content: createTiptapContent("Back"),
			};

			const createdCard = createMockCard({
				deck_id: "deck-1",
				sync_status: "pending",
			});
			mockDBClient.cards.create.mockResolvedValue(createdCard);

			// When: create(userId, payload) を実行
			await repository.create("user-1", payload);

			// Then: カードが作成され、FSRS初期値が設定される
			expect(mockDBClient.cards.create).toHaveBeenCalled();
			const createCall = mockDBClient.cards.create.mock.calls[0];
			const createdEntity = createCall[1];

			expect(createdEntity.deck_id).toBe("deck-1");
			expect(createdEntity.user_id).toBe("user-1");
			expect(createdEntity.ease_factor).toBe(2.5);
			expect(createdEntity.repetition_count).toBe(0);
			expect(createdEntity.sync_status).toBe("pending");
		});
	});
});
