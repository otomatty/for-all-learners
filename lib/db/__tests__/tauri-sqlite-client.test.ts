/**
 * Tauri SQLite クライアント テスト
 *
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Tauri API のモック
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
	invoke: (cmd: string, args?: Record<string, unknown>) =>
		mockInvoke(cmd, args),
}));

// テスト対象のクライアントをインポート
import {
	cardsClient,
	decksClient,
	learningLogsClient,
	milestonesClient,
	notesClient,
	pagesClient,
	studyGoalsClient,
	tauriDB,
	userSettingsClient,
} from "../tauri-sqlite-client";
import type { LocalDeck, LocalNote } from "../types";

// ============================================================================
// Notes クライアント テスト
// ============================================================================

describe("notesClient", () => {
	beforeEach(() => {
		mockInvoke.mockClear();
	});

	describe("getAll", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			const mockNotes: LocalNote[] = [];
			mockInvoke.mockResolvedValueOnce(mockNotes);

			const result = await notesClient.getAll("user-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_notes", {
				ownerId: "user-123",
			});
			expect(result).toEqual(mockNotes);
		});
	});

	describe("getById", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			const mockNote: LocalNote = {
				id: "note-1",
				owner_id: "user-123",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
				page_count: 0,
				participant_count: 0,
				is_default_note: null,
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2025-01-01T00:00:00Z",
				server_updated_at: null,
			};
			mockInvoke.mockResolvedValueOnce(mockNote);

			const result = await notesClient.getById("note-1");

			expect(mockInvoke).toHaveBeenCalledWith("get_note", { id: "note-1" });
			expect(result).toEqual(mockNote);
		});

		it("存在しないノートの場合nullを返す", async () => {
			mockInvoke.mockResolvedValueOnce(null);

			const result = await notesClient.getById("non-existent");

			expect(result).toBeNull();
		});
	});

	describe("create", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			const note: LocalNote = {
				id: "note-1",
				owner_id: "user-123",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
				page_count: 0,
				participant_count: 0,
				is_default_note: null,
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2025-01-01T00:00:00Z",
				server_updated_at: null,
			};
			mockInvoke.mockResolvedValueOnce(undefined);

			await notesClient.create(note);

			expect(mockInvoke).toHaveBeenCalledWith("create_note", { note });
		});
	});

	describe("update", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			const updates = { title: "Updated Title" };
			mockInvoke.mockResolvedValueOnce({
				id: "note-1",
				title: "Updated Title",
			});

			await notesClient.update("note-1", updates);

			expect(mockInvoke).toHaveBeenCalledWith("update_note", {
				id: "note-1",
				updates,
			});
		});
	});

	describe("delete", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce(true);

			const result = await notesClient.delete("note-1");

			expect(mockInvoke).toHaveBeenCalledWith("delete_note", { id: "note-1" });
			expect(result).toBe(true);
		});
	});

	describe("getPendingSync", () => {
		it("正しいコマンドでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await notesClient.getPendingSync();

			expect(mockInvoke).toHaveBeenCalledWith(
				"get_pending_sync_notes",
				undefined,
			);
		});
	});

	describe("markSynced", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce(undefined);

			await notesClient.markSynced("note-1", "2025-01-01T00:00:00Z");

			expect(mockInvoke).toHaveBeenCalledWith("mark_note_synced", {
				id: "note-1",
				serverUpdatedAt: "2025-01-01T00:00:00Z",
			});
		});
	});
});

// ============================================================================
// Pages クライアント テスト
// ============================================================================

describe("pagesClient", () => {
	beforeEach(() => {
		mockInvoke.mockClear();
	});

	describe("getAll", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await pagesClient.getAll("user-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_pages", {
				userId: "user-123",
			});
		});
	});

	describe("getByNote", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await pagesClient.getByNote("note-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_pages_by_note", {
				noteId: "note-123",
			});
		});
	});
});

// ============================================================================
// Decks クライアント テスト
// ============================================================================

describe("decksClient", () => {
	beforeEach(() => {
		mockInvoke.mockClear();
	});

	describe("getAll", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await decksClient.getAll("user-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_decks", {
				userId: "user-123",
			});
		});
	});

	describe("create", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			const deck: LocalDeck = {
				id: "deck-1",
				user_id: "user-123",
				title: "Test Deck",
				description: null,
				is_public: false,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2025-01-01T00:00:00Z",
				server_updated_at: null,
			};
			mockInvoke.mockResolvedValueOnce(undefined);

			await decksClient.create(deck);

			expect(mockInvoke).toHaveBeenCalledWith("create_deck", { deck });
		});
	});
});

// ============================================================================
// Cards クライアント テスト
// ============================================================================

describe("cardsClient", () => {
	beforeEach(() => {
		mockInvoke.mockClear();
	});

	describe("getByDeck", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await cardsClient.getByDeck("deck-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_cards", {
				deckId: "deck-123",
			});
		});
	});

	describe("getDue", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await cardsClient.getDue("user-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_due_cards", {
				userId: "user-123",
			});
		});
	});
});

// ============================================================================
// Study Goals クライアント テスト
// ============================================================================

describe("studyGoalsClient", () => {
	beforeEach(() => {
		mockInvoke.mockClear();
	});

	describe("getAll", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await studyGoalsClient.getAll("user-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_study_goals", {
				userId: "user-123",
			});
		});
	});
});

// ============================================================================
// Learning Logs クライアント テスト
// ============================================================================

describe("learningLogsClient", () => {
	beforeEach(() => {
		mockInvoke.mockClear();
	});

	describe("getByUser", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await learningLogsClient.getByUser("user-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_learning_logs", {
				userId: "user-123",
			});
		});
	});

	describe("getByCard", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await learningLogsClient.getByCard("card-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_learning_logs_by_card", {
				cardId: "card-123",
			});
		});
	});
});

// ============================================================================
// Milestones クライアント テスト
// ============================================================================

describe("milestonesClient", () => {
	beforeEach(() => {
		mockInvoke.mockClear();
	});

	describe("getByGoal", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await milestonesClient.getByGoal("goal-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_milestones", {
				goalId: "goal-123",
			});
		});
	});
});

// ============================================================================
// User Settings クライアント テスト
// ============================================================================

describe("userSettingsClient", () => {
	beforeEach(() => {
		mockInvoke.mockClear();
	});

	describe("get", () => {
		it("正しいコマンドとパラメータでinvokeを呼び出す", async () => {
			mockInvoke.mockResolvedValueOnce(null);

			await userSettingsClient.get("user-123");

			expect(mockInvoke).toHaveBeenCalledWith("get_user_settings", {
				userId: "user-123",
			});
		});
	});
});

// ============================================================================
// 統合クライアント テスト
// ============================================================================

describe("tauriDB", () => {
	it("全てのクライアントを含む", () => {
		expect(tauriDB.notes).toBe(notesClient);
		expect(tauriDB.pages).toBe(pagesClient);
		expect(tauriDB.decks).toBe(decksClient);
		expect(tauriDB.cards).toBe(cardsClient);
		expect(tauriDB.studyGoals).toBe(studyGoalsClient);
		expect(tauriDB.learningLogs).toBe(learningLogsClient);
		expect(tauriDB.milestones).toBe(milestonesClient);
		expect(tauriDB.userSettings).toBe(userSettingsClient);
	});
});
