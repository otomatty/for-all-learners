/**
 * IndexedDB クライアント テスト
 *
 * DEPENDENCY MAP:
 *
 * Dependencies:
 *   ├─ lib/db/indexeddb-client.ts
 *   ├─ lib/db/types.ts
 *   └─ lib/db/__tests__/helpers.ts
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
	cardsClient,
	closeLocalDB,
	decksClient,
	getLocalDB,
	notesClient,
	pagesClient,
	studyGoalsClient,
} from "../indexeddb-client";
import {
	createTestCardPayload,
	createTestDeckPayload,
	createTestNotePayload,
	createTestPagePayload,
	createTestStudyGoalPayload,
	TEST_USER_ID,
} from "./helpers";

describe("IndexedDB Client", () => {
	beforeEach(async () => {
		// 各テスト前にDBを初期化
		await getLocalDB();
	});

	afterEach(async () => {
		// 各テスト後にDBを閉じてクリア
		await closeLocalDB();
		// fake-indexeddb のリセット
		indexedDB.deleteDatabase("for-all-learners-local");
	});

	describe("notesClient", () => {
		it("should create a note", async () => {
			const payload = createTestNotePayload();
			const note = await notesClient.create(TEST_USER_ID, payload);

			expect(note).toBeDefined();
			expect(note.id).toBeDefined();
			expect(note.owner_id).toBe(TEST_USER_ID);
			expect(note.title).toBe(payload.title);
			expect(note.slug).toBe(payload.slug);
			expect(note.sync_status).toBe("pending");
		});

		it("should get all notes by owner", async () => {
			const payload1 = createTestNotePayload({
				title: "Note 1",
				slug: "note-1",
			});
			const payload2 = createTestNotePayload({
				title: "Note 2",
				slug: "note-2",
			});

			await notesClient.create(TEST_USER_ID, payload1);
			await notesClient.create(TEST_USER_ID, payload2);

			const notes = await notesClient.getAll(TEST_USER_ID);
			expect(notes).toHaveLength(2);
		});

		it("should get a note by id", async () => {
			const payload = createTestNotePayload();
			const created = await notesClient.create(TEST_USER_ID, payload);

			const note = await notesClient.getById(created.id);
			expect(note).toBeDefined();
			expect(note?.id).toBe(created.id);
		});

		it("should update a note", async () => {
			const payload = createTestNotePayload();
			const created = await notesClient.create(TEST_USER_ID, payload);

			const updated = await notesClient.update(created.id, {
				title: "Updated Title",
			});

			expect(updated).toBeDefined();
			expect(updated?.title).toBe("Updated Title");
			expect(updated?.sync_status).toBe("pending");
		});

		it("should delete a note (logical delete)", async () => {
			const payload = createTestNotePayload();
			const created = await notesClient.create(TEST_USER_ID, payload);

			const result = await notesClient.delete(created.id);
			expect(result).toBe(true);

			const note = await notesClient.getById(created.id);
			expect(note?.sync_status).toBe("deleted");
		});

		it("should get pending sync notes", async () => {
			const payload = createTestNotePayload();
			await notesClient.create(TEST_USER_ID, payload);

			const pending = await notesClient.getPendingSync();
			expect(pending).toHaveLength(1);
		});

		it("should mark note as synced", async () => {
			const payload = createTestNotePayload();
			const created = await notesClient.create(TEST_USER_ID, payload);

			await notesClient.markSynced(created.id, new Date().toISOString());

			const note = await notesClient.getById(created.id);
			expect(note?.sync_status).toBe("synced");
		});
	});

	describe("pagesClient", () => {
		it("should create a page", async () => {
			const payload = createTestPagePayload();
			const page = await pagesClient.create(TEST_USER_ID, payload);

			expect(page).toBeDefined();
			expect(page.id).toBeDefined();
			expect(page.user_id).toBe(TEST_USER_ID);
			expect(page.title).toBe(payload.title);
			expect(page.sync_status).toBe("pending");
		});

		it("should get pages by note", async () => {
			const noteId = "test-note-id";
			const payload1 = createTestPagePayload({
				title: "Page 1",
				note_id: noteId,
			});
			const payload2 = createTestPagePayload({
				title: "Page 2",
				note_id: noteId,
			});
			const payload3 = createTestPagePayload({
				title: "Page 3",
				note_id: null,
			});

			await pagesClient.create(TEST_USER_ID, payload1);
			await pagesClient.create(TEST_USER_ID, payload2);
			await pagesClient.create(TEST_USER_ID, payload3);

			const pages = await pagesClient.getByNote(noteId);
			expect(pages).toHaveLength(2);
		});

		it("should update a page", async () => {
			const payload = createTestPagePayload();
			const created = await pagesClient.create(TEST_USER_ID, payload);

			const updated = await pagesClient.update(created.id, {
				title: "Updated Page Title",
			});

			expect(updated).toBeDefined();
			expect(updated?.title).toBe("Updated Page Title");
		});
	});

	describe("decksClient", () => {
		it("should create a deck", async () => {
			const payload = createTestDeckPayload();
			const deck = await decksClient.create(TEST_USER_ID, payload);

			expect(deck).toBeDefined();
			expect(deck.id).toBeDefined();
			expect(deck.user_id).toBe(TEST_USER_ID);
			expect(deck.title).toBe(payload.title);
			expect(deck.sync_status).toBe("pending");
		});

		it("should get all decks by user", async () => {
			const payload1 = createTestDeckPayload({ title: "Deck 1" });
			const payload2 = createTestDeckPayload({ title: "Deck 2" });

			await decksClient.create(TEST_USER_ID, payload1);
			await decksClient.create(TEST_USER_ID, payload2);

			const decks = await decksClient.getAll(TEST_USER_ID);
			expect(decks).toHaveLength(2);
		});

		it("should update a deck", async () => {
			const payload = createTestDeckPayload();
			const created = await decksClient.create(TEST_USER_ID, payload);

			const updated = await decksClient.update(created.id, {
				title: "Updated Deck Title",
				is_public: true,
			});

			expect(updated).toBeDefined();
			expect(updated?.title).toBe("Updated Deck Title");
			expect(updated?.is_public).toBe(true);
		});
	});

	describe("cardsClient", () => {
		let testDeckId: string;

		beforeEach(async () => {
			const deck = await decksClient.create(
				TEST_USER_ID,
				createTestDeckPayload(),
			);
			testDeckId = deck.id;
		});

		it("should create a card", async () => {
			const payload = createTestCardPayload(testDeckId);
			const card = await cardsClient.create(TEST_USER_ID, payload);

			expect(card).toBeDefined();
			expect(card.id).toBeDefined();
			expect(card.deck_id).toBe(testDeckId);
			expect(card.user_id).toBe(TEST_USER_ID);
			expect(card.sync_status).toBe("pending");
		});

		it("should create multiple cards", async () => {
			const payloads = [
				createTestCardPayload(testDeckId),
				createTestCardPayload(testDeckId),
				createTestCardPayload(testDeckId),
			];
			const cards = await cardsClient.createMany(TEST_USER_ID, payloads);

			expect(cards).toHaveLength(3);
			for (const card of cards) {
				expect(card.deck_id).toBe(testDeckId);
			}
		});

		it("should get cards by deck", async () => {
			await cardsClient.createMany(TEST_USER_ID, [
				createTestCardPayload(testDeckId),
				createTestCardPayload(testDeckId),
			]);

			const cards = await cardsClient.getByDeck(testDeckId);
			expect(cards).toHaveLength(2);
		});

		it("should update a card", async () => {
			const payload = createTestCardPayload(testDeckId);
			const created = await cardsClient.create(TEST_USER_ID, payload);

			const updated = await cardsClient.update(created.id, {
				ease_factor: 2.8,
				repetition_count: 1,
			});

			expect(updated).toBeDefined();
			expect(updated?.ease_factor).toBe(2.8);
			expect(updated?.repetition_count).toBe(1);
		});

		it("should get due cards", async () => {
			const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1日前
			const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1日後

			await cardsClient.create(TEST_USER_ID, createTestCardPayload(testDeckId));
			const dueCard = await cardsClient.create(
				TEST_USER_ID,
				createTestCardPayload(testDeckId),
			);
			await cardsClient.update(dueCard.id, { next_review_at: pastDate });

			const notDueCard = await cardsClient.create(
				TEST_USER_ID,
				createTestCardPayload(testDeckId),
			);
			await cardsClient.update(notDueCard.id, { next_review_at: futureDate });

			const dueCards = await cardsClient.getDueCards(TEST_USER_ID);
			expect(dueCards).toHaveLength(1);
			expect(dueCards[0].id).toBe(dueCard.id);
		});
	});

	describe("studyGoalsClient", () => {
		it("should create a study goal", async () => {
			const payload = createTestStudyGoalPayload();
			const goal = await studyGoalsClient.create(TEST_USER_ID, payload);

			expect(goal).toBeDefined();
			expect(goal.id).toBeDefined();
			expect(goal.user_id).toBe(TEST_USER_ID);
			expect(goal.title).toBe(payload.title);
			expect(goal.status).toBe("not_started");
			expect(goal.sync_status).toBe("pending");
		});

		it("should get all study goals by user", async () => {
			await studyGoalsClient.create(
				TEST_USER_ID,
				createTestStudyGoalPayload({ title: "Goal 1" }),
			);
			await studyGoalsClient.create(
				TEST_USER_ID,
				createTestStudyGoalPayload({ title: "Goal 2" }),
			);

			const goals = await studyGoalsClient.getAll(TEST_USER_ID);
			expect(goals).toHaveLength(2);
		});

		it("should update a study goal", async () => {
			const payload = createTestStudyGoalPayload();
			const created = await studyGoalsClient.create(TEST_USER_ID, payload);

			const updated = await studyGoalsClient.update(created.id, {
				status: "in_progress",
				progress_rate: 50,
			});

			expect(updated).toBeDefined();
			expect(updated?.status).toBe("in_progress");
			expect(updated?.progress_rate).toBe(50);
		});

		it("should complete a study goal", async () => {
			const payload = createTestStudyGoalPayload();
			const created = await studyGoalsClient.create(TEST_USER_ID, payload);

			const completedAt = new Date().toISOString();
			const updated = await studyGoalsClient.update(created.id, {
				status: "completed",
				progress_rate: 100,
				completed_at: completedAt,
			});

			expect(updated).toBeDefined();
			expect(updated?.status).toBe("completed");
			expect(updated?.progress_rate).toBe(100);
			expect(updated?.completed_at).toBe(completedAt);
		});
	});
});
