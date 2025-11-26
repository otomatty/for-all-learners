/**
 * 競合解決ロジックのテスト
 *
 * Issue: https://github.com/otomatty/for-all-learners/issues/194
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { LocalNote } from "@/lib/db/types";
import { ConflictResolver } from "../conflict-resolver";
import type { ConflictData } from "../types";

describe("ConflictResolver", () => {
	let resolver: ConflictResolver;

	beforeEach(() => {
		resolver = new ConflictResolver();
	});

	describe("resolve", () => {
		it("ローカルが新しい場合は 'local' を返す", () => {
			const local: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "pending",
				synced_at: "2024-01-01T00:00:00.000Z",
				local_updated_at: "2024-01-02T12:00:00.000Z", // 新しい
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			const server: LocalNote = {
				...local,
				local_updated_at: "2024-01-02T10:00:00.000Z",
				server_updated_at: "2024-01-02T10:00:00.000Z", // 古い
			};

			expect(resolver.resolve(local, server)).toBe("local");
		});

		it("サーバーが新しい場合は 'server' を返す", () => {
			const local: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "pending",
				synced_at: "2024-01-01T00:00:00.000Z",
				local_updated_at: "2024-01-02T10:00:00.000Z", // 古い
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			const server: LocalNote = {
				...local,
				local_updated_at: "2024-01-02T12:00:00.000Z",
				server_updated_at: "2024-01-02T12:00:00.000Z", // 新しい
			};

			expect(resolver.resolve(local, server)).toBe("server");
		});

		it("同時刻の場合は 'local' を返す（ローカル優先）", () => {
			const timestamp = "2024-01-02T12:00:00.000Z";
			const local: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "pending",
				synced_at: "2024-01-01T00:00:00.000Z",
				local_updated_at: timestamp,
				server_updated_at: timestamp,
			};

			const server: LocalNote = {
				...local,
				server_updated_at: timestamp,
			};

			expect(resolver.resolve(local, server)).toBe("local");
		});

		it("サーバーの server_updated_at が null の場合は 'local' を返す", () => {
			const local: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "pending",
				synced_at: null,
				local_updated_at: "2024-01-02T12:00:00.000Z",
				server_updated_at: null,
			};

			const server: LocalNote = {
				...local,
				server_updated_at: null, // null
			};

			expect(resolver.resolve(local, server)).toBe("local");
		});
	});

	describe("merge", () => {
		it("ローカルが勝った場合は sync_status を 'pending' にする", () => {
			const local: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Local Title",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "pending",
				synced_at: "2024-01-01T00:00:00.000Z",
				local_updated_at: "2024-01-02T12:00:00.000Z",
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			const server: LocalNote = {
				...local,
				title: "Server Title",
				local_updated_at: "2024-01-02T10:00:00.000Z",
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			const result = resolver.merge(local, server);

			expect(result.title).toBe("Local Title");
			expect(result.sync_status).toBe("pending");
		});

		it("サーバーが勝った場合は sync_status を 'synced' にする", () => {
			const local: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Local Title",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "pending",
				synced_at: "2024-01-01T00:00:00.000Z",
				local_updated_at: "2024-01-02T10:00:00.000Z",
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			const server: LocalNote = {
				...local,
				title: "Server Title",
				local_updated_at: "2024-01-02T12:00:00.000Z",
				server_updated_at: "2024-01-02T12:00:00.000Z",
			};

			const result = resolver.merge(local, server);

			expect(result.title).toBe("Server Title");
			expect(result.sync_status).toBe("synced");
			expect(result.synced_at).toBeDefined();
		});
	});

	describe("resolveConflict", () => {
		it("競合データから解決結果を取得できる", () => {
			const local: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Local Title",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "conflict",
				synced_at: "2024-01-01T00:00:00.000Z",
				local_updated_at: "2024-01-02T12:00:00.000Z",
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			const server: LocalNote = {
				...local,
				title: "Server Title",
				local_updated_at: "2024-01-02T10:00:00.000Z",
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			const conflictData: ConflictData<LocalNote> = {
				local,
				server,
				tableName: "notes",
			};

			const result = resolver.resolveConflict(conflictData);

			expect(result.winner).toBe("local");
			expect(result.resolved.title).toBe("Local Title");
			expect(result.tableName).toBe("notes");
		});
	});

	describe("resolveAll", () => {
		it("複数の競合を一括解決できる", () => {
			const conflicts: ConflictData<LocalNote>[] = [
				{
					local: {
						id: "note-1",
						owner_id: "user-1",
						slug: "test-note-1",
						title: "Local 1",
						description: null,
						visibility: "private",
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-02T00:00:00.000Z",
						is_trashed: false,
						trashed_at: null,
						sync_status: "conflict",
						synced_at: "2024-01-01T00:00:00.000Z",
						local_updated_at: "2024-01-02T12:00:00.000Z",
						server_updated_at: "2024-01-02T10:00:00.000Z",
					},
					server: {
						id: "note-1",
						owner_id: "user-1",
						slug: "test-note-1",
						title: "Server 1",
						description: null,
						visibility: "private",
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-02T00:00:00.000Z",
						is_trashed: false,
						trashed_at: null,
						sync_status: "synced",
						synced_at: "2024-01-02T10:00:00.000Z",
						local_updated_at: "2024-01-02T10:00:00.000Z",
						server_updated_at: "2024-01-02T10:00:00.000Z",
					},
					tableName: "notes",
				},
				{
					local: {
						id: "note-2",
						owner_id: "user-1",
						slug: "test-note-2",
						title: "Local 2",
						description: null,
						visibility: "private",
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-02T00:00:00.000Z",
						is_trashed: false,
						trashed_at: null,
						sync_status: "conflict",
						synced_at: "2024-01-01T00:00:00.000Z",
						local_updated_at: "2024-01-02T08:00:00.000Z",
						server_updated_at: "2024-01-02T10:00:00.000Z",
					},
					server: {
						id: "note-2",
						owner_id: "user-1",
						slug: "test-note-2",
						title: "Server 2",
						description: null,
						visibility: "private",
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-02T00:00:00.000Z",
						is_trashed: false,
						trashed_at: null,
						sync_status: "synced",
						synced_at: "2024-01-02T10:00:00.000Z",
						local_updated_at: "2024-01-02T10:00:00.000Z",
						server_updated_at: "2024-01-02T10:00:00.000Z",
					},
					tableName: "notes",
				},
			];

			const results = resolver.resolveAll(conflicts);

			expect(results).toHaveLength(2);
			expect(results[0].winner).toBe("local");
			expect(results[0].resolved.title).toBe("Local 1");
			expect(results[1].winner).toBe("server");
			expect(results[1].resolved.title).toBe("Server 2");
		});
	});

	describe("isServerNewer", () => {
		it("サーバーが新しい場合は true を返す", () => {
			const local: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "synced",
				synced_at: "2024-01-01T00:00:00.000Z",
				local_updated_at: "2024-01-02T10:00:00.000Z",
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			expect(resolver.isServerNewer(local, "2024-01-02T12:00:00.000Z")).toBe(
				true,
			);
		});

		it("ローカルが新しいまたは同じ場合は false を返す", () => {
			const local: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "synced",
				synced_at: "2024-01-01T00:00:00.000Z",
				local_updated_at: "2024-01-02T12:00:00.000Z",
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			expect(resolver.isServerNewer(local, "2024-01-02T10:00:00.000Z")).toBe(
				false,
			);
			expect(resolver.isServerNewer(local, "2024-01-02T12:00:00.000Z")).toBe(
				false,
			);
		});
	});

	describe("hasLocalChanges", () => {
		it("同期後に変更があった場合は true を返す", () => {
			const entity: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "pending",
				synced_at: "2024-01-02T10:00:00.000Z",
				local_updated_at: "2024-01-02T12:00:00.000Z", // synced_at より後
				server_updated_at: "2024-01-02T10:00:00.000Z",
			};

			expect(resolver.hasLocalChanges(entity)).toBe(true);
		});

		it("同期後に変更がない場合は false を返す", () => {
			const entity: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "synced",
				synced_at: "2024-01-02T12:00:00.000Z",
				local_updated_at: "2024-01-02T10:00:00.000Z", // synced_at より前
				server_updated_at: "2024-01-02T12:00:00.000Z",
			};

			expect(resolver.hasLocalChanges(entity)).toBe(false);
		});

		it("一度も同期されていない場合は true を返す", () => {
			const entity: LocalNote = {
				id: "note-1",
				owner_id: "user-1",
				slug: "test-note",
				title: "Test Note",
				description: null,
				visibility: "private",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				is_trashed: false,
				trashed_at: null,
				sync_status: "pending",
				synced_at: null, // 未同期
				local_updated_at: "2024-01-02T12:00:00.000Z",
				server_updated_at: null,
			};

			expect(resolver.hasLocalChanges(entity)).toBe(true);
		});
	});
});
