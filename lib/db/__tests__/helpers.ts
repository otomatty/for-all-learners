/**
 * IndexedDB テストヘルパー
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/db/__tests__/*.test.ts
 *
 * Dependencies:
 *   └─ lib/db/types.ts
 */

import type {
	CreateCardPayload,
	CreateDeckPayload,
	CreateNotePayload,
	CreatePagePayload,
	CreateStudyGoalPayload,
	LocalCard,
	LocalDeck,
	LocalNote,
	LocalPage,
	LocalStudyGoal,
	TiptapContent,
} from "../types";

/**
 * テスト用のユーザーID
 */
export const TEST_USER_ID = "test-user-123";

/**
 * テスト用のTiptapコンテンツを生成
 */
export function createTestTiptapContent(text: string): TiptapContent {
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
 * テスト用のノートペイロードを生成
 */
export function createTestNotePayload(
	overrides: Partial<CreateNotePayload> = {},
): CreateNotePayload {
	return {
		title: "Test Note",
		slug: `test-note-${Date.now()}`,
		description: "Test description",
		visibility: "private",
		...overrides,
	};
}

/**
 * テスト用のページペイロードを生成
 */
export function createTestPagePayload(
	overrides: Partial<CreatePagePayload> = {},
): CreatePagePayload {
	return {
		title: "Test Page",
		note_id: null,
		is_public: false,
		thumbnail_url: null,
		...overrides,
	};
}

/**
 * テスト用のデッキペイロードを生成
 */
export function createTestDeckPayload(
	overrides: Partial<CreateDeckPayload> = {},
): CreateDeckPayload {
	return {
		title: "Test Deck",
		description: "Test deck description",
		is_public: false,
		...overrides,
	};
}

/**
 * テスト用のカードペイロードを生成
 */
export function createTestCardPayload(
	deckId: string,
	overrides: Partial<Omit<CreateCardPayload, "deck_id">> = {},
): CreateCardPayload {
	return {
		deck_id: deckId,
		front_content: createTestTiptapContent("Front content"),
		back_content: createTestTiptapContent("Back content"),
		source_audio_url: null,
		source_ocr_image_url: null,
		...overrides,
	};
}

/**
 * テスト用の学習目標ペイロードを生成
 */
export function createTestStudyGoalPayload(
	overrides: Partial<CreateStudyGoalPayload> = {},
): CreateStudyGoalPayload {
	return {
		title: "Test Study Goal",
		description: "Test goal description",
		deadline: null,
		...overrides,
	};
}

/**
 * ローカルノートのモックを生成
 */
export function mockLocalNote(overrides: Partial<LocalNote> = {}): LocalNote {
	const timestamp = new Date().toISOString();
	return {
		id: `note-${Date.now()}`,
		owner_id: TEST_USER_ID,
		slug: `test-note-${Date.now()}`,
		title: "Test Note",
		description: "Test description",
		visibility: "private",
		created_at: timestamp,
		updated_at: timestamp,
		is_trashed: false,
		trashed_at: null,
		sync_status: "synced",
		synced_at: timestamp,
		local_updated_at: timestamp,
		server_updated_at: timestamp,
		...overrides,
	};
}

/**
 * ローカルページのモックを生成
 */
export function mockLocalPage(overrides: Partial<LocalPage> = {}): LocalPage {
	const timestamp = new Date().toISOString();
	return {
		id: `page-${Date.now()}`,
		user_id: TEST_USER_ID,
		note_id: null,
		title: "Test Page",
		thumbnail_url: null,
		is_public: false,
		scrapbox_page_id: null,
		scrapbox_page_list_synced_at: null,
		scrapbox_page_content_synced_at: null,
		created_at: timestamp,
		updated_at: timestamp,
		sync_status: "synced",
		synced_at: timestamp,
		local_updated_at: timestamp,
		server_updated_at: timestamp,
		...overrides,
	};
}

/**
 * ローカルデッキのモックを生成
 */
export function mockLocalDeck(overrides: Partial<LocalDeck> = {}): LocalDeck {
	const timestamp = new Date().toISOString();
	return {
		id: `deck-${Date.now()}`,
		user_id: TEST_USER_ID,
		title: "Test Deck",
		description: "Test description",
		is_public: false,
		created_at: timestamp,
		updated_at: timestamp,
		sync_status: "synced",
		synced_at: timestamp,
		local_updated_at: timestamp,
		server_updated_at: timestamp,
		...overrides,
	};
}

/**
 * ローカルカードのモックを生成
 */
export function mockLocalCard(
	deckId: string,
	overrides: Partial<LocalCard> = {},
): LocalCard {
	const timestamp = new Date().toISOString();
	return {
		id: `card-${Date.now()}`,
		deck_id: deckId,
		user_id: TEST_USER_ID,
		front_content: createTestTiptapContent("Front"),
		back_content: createTestTiptapContent("Back"),
		source_audio_url: null,
		source_ocr_image_url: null,
		created_at: timestamp,
		updated_at: timestamp,
		ease_factor: 2.5,
		repetition_count: 0,
		review_interval: 0,
		next_review_at: null,
		stability: 0.0,
		difficulty: 1.0,
		last_reviewed_at: null,
		sync_status: "synced",
		synced_at: timestamp,
		local_updated_at: timestamp,
		server_updated_at: timestamp,
		...overrides,
	};
}

/**
 * ローカル学習目標のモックを生成
 */
export function mockLocalStudyGoal(
	overrides: Partial<LocalStudyGoal> = {},
): LocalStudyGoal {
	const timestamp = new Date().toISOString();
	return {
		id: `goal-${Date.now()}`,
		user_id: TEST_USER_ID,
		title: "Test Goal",
		description: "Test description",
		created_at: timestamp,
		updated_at: timestamp,
		deadline: null,
		progress_rate: 0,
		status: "not_started",
		completed_at: null,
		sync_status: "synced",
		synced_at: timestamp,
		local_updated_at: timestamp,
		server_updated_at: timestamp,
		...overrides,
	};
}
