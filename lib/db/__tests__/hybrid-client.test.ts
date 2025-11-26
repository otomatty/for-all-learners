/**
 * Hybrid DB クライアント テスト
 *
 * DEPENDENCY MAP:
 *
 * Dependencies:
 *   ├─ lib/db/hybrid-client.ts
 *   ├─ lib/db/indexeddb-client.ts
 *   └─ lib/db/types.ts
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";

// Mock logger
vi.mock("../../logger", () => ({
	default: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

// Import the module once for all tests
import { getDBClient, isIndexedDBAvailable, isTauri } from "../hybrid-client";
import { closeLocalDB } from "../indexeddb-client";

describe("Hybrid DB Client", () => {
	afterEach(async () => {
		// Close and clean up after each test
		await closeLocalDB();
		indexedDB.deleteDatabase("for-all-learners-local");
	});

	describe("Environment Detection", () => {
		it("should detect web environment when __TAURI__ is not present", () => {
			// Ensure __TAURI__ is not set
			if ("__TAURI__" in window) {
				delete (window as unknown as Record<string, unknown>).__TAURI__;
			}
			expect(isTauri()).toBe(false);
		});

		it("should detect Tauri environment when __TAURI__ is present", () => {
			// Set up Tauri environment
			(window as unknown as Record<string, unknown>).__TAURI__ = {};
			expect(isTauri()).toBe(true);
			// Clean up
			delete (window as unknown as Record<string, unknown>).__TAURI__;
		});

		it("should detect IndexedDB availability", () => {
			// In test environment with fake-indexeddb, it should be available
			expect(isIndexedDBAvailable()).toBe(true);
		});
	});

	describe("getDBClient", () => {
		it("should return IndexedDB client in web environment", async () => {
			const client = await getDBClient();

			expect(client).toBeDefined();
			expect(client.notes).toBeDefined();
			expect(client.pages).toBeDefined();
			expect(client.decks).toBeDefined();
			expect(client.cards).toBeDefined();
			expect(client.studyGoals).toBeDefined();
		});

		it("should have all required CRUD operations on notes client", async () => {
			const client = await getDBClient();

			expect(typeof client.notes.create).toBe("function");
			expect(typeof client.notes.getAll).toBe("function");
			expect(typeof client.notes.getById).toBe("function");
			expect(typeof client.notes.update).toBe("function");
			expect(typeof client.notes.delete).toBe("function");
			expect(typeof client.notes.getPendingSync).toBe("function");
			expect(typeof client.notes.markSynced).toBe("function");
		});

		it("should have all required CRUD operations on pages client", async () => {
			const client = await getDBClient();

			expect(typeof client.pages.create).toBe("function");
			expect(typeof client.pages.getAll).toBe("function");
			expect(typeof client.pages.getById).toBe("function");
			expect(typeof client.pages.getByNote).toBe("function");
			expect(typeof client.pages.update).toBe("function");
			expect(typeof client.pages.delete).toBe("function");
		});

		it("should have all required CRUD operations on decks client", async () => {
			const client = await getDBClient();

			expect(typeof client.decks.create).toBe("function");
			expect(typeof client.decks.getAll).toBe("function");
			expect(typeof client.decks.getById).toBe("function");
			expect(typeof client.decks.update).toBe("function");
			expect(typeof client.decks.delete).toBe("function");
		});

		it("should have all required CRUD operations on cards client", async () => {
			const client = await getDBClient();

			expect(typeof client.cards.create).toBe("function");
			expect(typeof client.cards.createMany).toBe("function");
			expect(typeof client.cards.getAll).toBe("function");
			expect(typeof client.cards.getById).toBe("function");
			expect(typeof client.cards.getByDeck).toBe("function");
			expect(typeof client.cards.getDueCards).toBe("function");
			expect(typeof client.cards.update).toBe("function");
			expect(typeof client.cards.delete).toBe("function");
		});

		it("should have all required CRUD operations on studyGoals client", async () => {
			const client = await getDBClient();

			expect(typeof client.studyGoals.create).toBe("function");
			expect(typeof client.studyGoals.getAll).toBe("function");
			expect(typeof client.studyGoals.getById).toBe("function");
			expect(typeof client.studyGoals.update).toBe("function");
			expect(typeof client.studyGoals.delete).toBe("function");
		});
	});

	describe("Integration with IndexedDB Client", () => {
		it("should perform CRUD operations through hybrid client", async () => {
			const client = await getDBClient();
			const testUserId = "test-user-crud";

			// Create
			const note = await client.notes.create(testUserId, {
				title: "Test Note",
				slug: "test-note-crud",
				description: "A test note",
				visibility: "private",
			});
			expect(note).toBeDefined();
			expect(note.id).toBeDefined();
			expect(note.title).toBe("Test Note");

			// Read
			const fetchedNote = await client.notes.getById(note.id);
			expect(fetchedNote).toBeDefined();
			expect(fetchedNote?.title).toBe("Test Note");

			// Update
			const updatedNote = await client.notes.update(note.id, {
				title: "Updated Note",
			});
			expect(updatedNote?.title).toBe("Updated Note");

			// Delete
			const deleteResult = await client.notes.delete(note.id);
			expect(deleteResult).toBe(true);

			// Verify deletion (logical)
			const deletedNote = await client.notes.getById(note.id);
			expect(deletedNote?.sync_status).toBe("deleted");
		});

		it("should create note with pending sync status", async () => {
			const client = await getDBClient();
			const testUserId = "test-user-sync-create";

			const note = await client.notes.create(testUserId, {
				title: "Sync Test Note",
				slug: "sync-test-create",
				description: null,
				visibility: "private",
			});
			expect(note.sync_status).toBe("pending");
		});

		it("should mark note as synced", async () => {
			const client = await getDBClient();
			const testUserId = "test-user-sync-mark";

			const note = await client.notes.create(testUserId, {
				title: "Note to Sync",
				slug: "sync-test-mark",
				description: null,
				visibility: "private",
			});

			const serverUpdatedAt = new Date().toISOString();
			await client.notes.markSynced(note.id, serverUpdatedAt);

			const syncedNote = await client.notes.getById(note.id);
			expect(syncedNote?.sync_status).toBe("synced");
			expect(syncedNote?.server_updated_at).toBe(serverUpdatedAt);
		});

		it("should set pending status on update after sync", async () => {
			const client = await getDBClient();
			const testUserId = "test-user-sync-update";

			// Create and sync
			const note = await client.notes.create(testUserId, {
				title: "Note for Update Test",
				slug: "sync-test-update",
				description: null,
				visibility: "private",
			});
			await client.notes.markSynced(note.id, new Date().toISOString());

			// Verify synced
			const syncedNote = await client.notes.getById(note.id);
			expect(syncedNote?.sync_status).toBe("synced");

			// Update should set back to pending
			const updatedNote = await client.notes.update(note.id, {
				title: "Modified Note",
			});
			expect(updatedNote?.sync_status).toBe("pending");
		});
	});

	describe("closeDB", () => {
		it("should close the database connection", async () => {
			const client = await getDBClient();
			await client.closeDB();

			// Getting a new client should work
			const newClient = await getDBClient();
			expect(newClient).toBeDefined();
		});
	});
});
