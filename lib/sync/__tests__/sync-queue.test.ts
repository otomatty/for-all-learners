/**
 * 同期キューのテスト
 *
 * Issue: https://github.com/otomatty/for-all-learners/issues/193
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalNote } from "@/lib/db/types";
import { SyncQueue } from "../sync-queue";

// localStorage のモック
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
	};
})();

Object.defineProperty(global, "localStorage", {
	value: localStorageMock,
});

// crypto.randomUUID のモック
let uuidCounter = 0;
vi.stubGlobal("crypto", {
	randomUUID: () => `uuid-${++uuidCounter}`,
});

describe("SyncQueue", () => {
	let queue: SyncQueue;

	beforeEach(() => {
		localStorageMock.clear();
		uuidCounter = 0;
		queue = new SyncQueue(3);
	});

	describe("enqueue", () => {
		it("アイテムをキューに追加できる", () => {
			const item = queue.enqueue("notes", "create", "note-1", {
				id: "note-1",
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2024-01-01T00:00:00.000Z",
				server_updated_at: null,
			} as LocalNote);

			expect(item.id).toBe("uuid-1");
			expect(item.table).toBe("notes");
			expect(item.operation).toBe("create");
			expect(item.entityId).toBe("note-1");
			expect(queue.size()).toBe(1);
		});

		it("同じエンティティの create → update は create のまま", () => {
			queue.enqueue("notes", "create", "note-1", {
				id: "note-1",
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2024-01-01T00:00:00.000Z",
				server_updated_at: null,
			} as LocalNote);

			queue.enqueue("notes", "update", "note-1", {
				id: "note-1",
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2024-01-01T01:00:00.000Z",
				server_updated_at: null,
			} as LocalNote);

			expect(queue.size()).toBe(1);
			const item = queue.peek();
			expect(item?.operation).toBe("create");
		});

		it("同じエンティティの update → update は最新の update で上書き", () => {
			queue.enqueue("notes", "update", "note-1", {
				id: "note-1",
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2024-01-01T00:00:00.000Z",
				server_updated_at: null,
			} as LocalNote);

			const updatedData = {
				id: "note-1",
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2024-01-01T01:00:00.000Z",
				server_updated_at: null,
			} as LocalNote;

			queue.enqueue("notes", "update", "note-1", updatedData);

			expect(queue.size()).toBe(1);
			const item = queue.peek();
			expect(item?.data).toEqual(updatedData);
		});

		it("delete が後から来た場合は delete で上書き", () => {
			queue.enqueue("notes", "create", "note-1", {
				id: "note-1",
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2024-01-01T00:00:00.000Z",
				server_updated_at: null,
			} as LocalNote);

			queue.enqueue("notes", "delete", "note-1", null);

			expect(queue.size()).toBe(1);
			const item = queue.peek();
			expect(item?.operation).toBe("delete");
			expect(item?.data).toBeNull();
		});
	});

	describe("dequeue", () => {
		it("キューの先頭からアイテムを取得して削除する", () => {
			queue.enqueue("notes", "create", "note-1", null);
			queue.enqueue("notes", "create", "note-2", null);

			const item = queue.dequeue();

			expect(item?.entityId).toBe("note-1");
			expect(queue.size()).toBe(1);
		});

		it("空のキューから dequeue すると undefined を返す", () => {
			const item = queue.dequeue();
			expect(item).toBeUndefined();
		});
	});

	describe("peek", () => {
		it("キューの先頭を参照するが削除しない", () => {
			queue.enqueue("notes", "create", "note-1", null);

			const item = queue.peek();

			expect(item?.entityId).toBe("note-1");
			expect(queue.size()).toBe(1);
		});
	});

	describe("remove", () => {
		it("指定したIDのアイテムを削除できる", () => {
			const item1 = queue.enqueue("notes", "create", "note-1", null);
			queue.enqueue("notes", "create", "note-2", null);

			const removed = queue.remove(item1.id);

			expect(removed).toBe(true);
			expect(queue.size()).toBe(1);
			expect(queue.peek()?.entityId).toBe("note-2");
		});

		it("存在しないIDの場合は false を返す", () => {
			queue.enqueue("notes", "create", "note-1", null);

			const removed = queue.remove("non-existent");

			expect(removed).toBe(false);
			expect(queue.size()).toBe(1);
		});
	});

	describe("retry", () => {
		it("リトライ回数を増やしてキューの最後に移動する", () => {
			const item1 = queue.enqueue("notes", "create", "note-1", null);
			queue.enqueue("notes", "create", "note-2", null);

			const retried = queue.retry(item1.id);

			expect(retried).toBe(true);
			expect(queue.size()).toBe(2);
			// note-2 が先頭に来る
			expect(queue.peek()?.entityId).toBe("note-2");
			// note-1 のリトライ回数が増えている
			const items = queue.getAll();
			const retriedItem = items.find((i) => i.entityId === "note-1");
			expect(retriedItem?.retryCount).toBe(1);
		});

		it("最大リトライ回数に達した場合は削除して false を返す", () => {
			const item = queue.enqueue("notes", "create", "note-1", null);

			// 3回リトライ
			queue.retry(item.id);
			queue.retry(item.id);
			queue.retry(item.id);
			const result = queue.retry(item.id);

			expect(result).toBe(false);
			expect(queue.size()).toBe(0);
		});
	});

	describe("getByTable", () => {
		it("テーブル別にアイテムを取得できる", () => {
			queue.enqueue("notes", "create", "note-1", null);
			queue.enqueue("pages", "create", "page-1", null);
			queue.enqueue("notes", "create", "note-2", null);

			const notesItems = queue.getByTable("notes");

			expect(notesItems).toHaveLength(2);
			expect(notesItems.every((item) => item.table === "notes")).toBe(true);
		});
	});

	describe("getBatch", () => {
		it("指定した数のアイテムをバッチで取得できる", () => {
			queue.enqueue("notes", "create", "note-1", null);
			queue.enqueue("notes", "create", "note-2", null);
			queue.enqueue("notes", "create", "note-3", null);

			const batch = queue.getBatch(2);

			expect(batch).toHaveLength(2);
			expect(batch[0].entityId).toBe("note-1");
			expect(batch[1].entityId).toBe("note-2");
		});
	});

	describe("removeBatch", () => {
		it("複数のアイテムを一括削除できる", () => {
			const item1 = queue.enqueue("notes", "create", "note-1", null);
			const item2 = queue.enqueue("notes", "create", "note-2", null);
			queue.enqueue("notes", "create", "note-3", null);

			const removedCount = queue.removeBatch([item1.id, item2.id]);

			expect(removedCount).toBe(2);
			expect(queue.size()).toBe(1);
			expect(queue.peek()?.entityId).toBe("note-3");
		});
	});

	describe("clear", () => {
		it("キューをクリアできる", () => {
			queue.enqueue("notes", "create", "note-1", null);
			queue.enqueue("notes", "create", "note-2", null);

			queue.clear();

			expect(queue.size()).toBe(0);
			expect(queue.isEmpty()).toBe(true);
		});
	});

	describe("isEmpty", () => {
		it("空の場合は true を返す", () => {
			expect(queue.isEmpty()).toBe(true);
		});

		it("アイテムがある場合は false を返す", () => {
			queue.enqueue("notes", "create", "note-1", null);
			expect(queue.isEmpty()).toBe(false);
		});
	});

	describe("永続化", () => {
		it("キューが localStorage に保存される", () => {
			queue.enqueue("notes", "create", "note-1", null);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"for-all-learners-sync-queue",
				expect.any(String),
			);
		});

		it("localStorage からキューを復元できる", () => {
			const savedQueue = [
				{
					id: "saved-uuid-1",
					table: "notes",
					operation: "create",
					entityId: "note-1",
					data: null,
					timestamp: "2024-01-01T00:00:00.000Z",
					retryCount: 0,
					maxRetries: 3,
				},
			];
			localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedQueue));

			const restoredQueue = new SyncQueue(3);

			expect(restoredQueue.size()).toBe(1);
			expect(restoredQueue.peek()?.id).toBe("saved-uuid-1");
		});
	});
});
