/**
 * Repository テスト用ヘルパー
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/repositories/__tests__/base-repository.test.ts
 *
 * Dependencies:
 *   └─ lib/db/types.ts
 */

import { vi } from "vitest";
import type { LocalNote } from "@/lib/db/types";

/**
 * テスト用のモックノートを作成
 */
export function createMockNote(overrides: Partial<LocalNote> = {}): LocalNote {
	const now = new Date().toISOString();
	return {
		id: overrides.id ?? crypto.randomUUID(),
		owner_id: overrides.owner_id ?? "test-user-id",
		slug: overrides.slug ?? "test-note",
		title: overrides.title ?? "Test Note",
		description: overrides.description ?? null,
		visibility: overrides.visibility ?? "private",
		created_at: overrides.created_at ?? now,
		updated_at: overrides.updated_at ?? now,
		page_count: overrides.page_count ?? 0,
		participant_count: overrides.participant_count ?? 1,
		is_default_note: overrides.is_default_note ?? false,
		sync_status: overrides.sync_status ?? "synced",
		synced_at: overrides.synced_at ?? now,
		local_updated_at: overrides.local_updated_at ?? now,
		server_updated_at: overrides.server_updated_at ?? now,
	};
}

/**
 * モックDBクライアントインターフェース
 */
export interface MockDBClient {
	notes: {
		getAll: ReturnType<typeof vi.fn>;
		getById: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
		delete: ReturnType<typeof vi.fn>;
		hardDelete: ReturnType<typeof vi.fn>;
		getPendingSync: ReturnType<typeof vi.fn>;
		getDeleted: ReturnType<typeof vi.fn>;
		markSynced: ReturnType<typeof vi.fn>;
		markConflict: ReturnType<typeof vi.fn>;
		overwriteWithServer: ReturnType<typeof vi.fn>;
	};
	closeDB: ReturnType<typeof vi.fn>;
}

/**
 * モックDBクライアントを作成
 */
export function createMockDBClient(): MockDBClient {
	return {
		notes: {
			getAll: vi.fn(),
			getById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			hardDelete: vi.fn(),
			getPendingSync: vi.fn(),
			getDeleted: vi.fn(),
			markSynced: vi.fn(),
			markConflict: vi.fn(),
			overwriteWithServer: vi.fn(),
		},
		closeDB: vi.fn(),
	};
}

/**
 * モックSyncManagerを作成
 */
export interface MockSyncManager {
	sync: ReturnType<typeof vi.fn>;
	getState: ReturnType<typeof vi.fn>;
}

export function createMockSyncManager(): MockSyncManager {
	return {
		sync: vi.fn().mockResolvedValue({
			success: true,
			pushed: 0,
			pulled: 0,
			conflicts: 0,
			errors: [],
			completedAt: new Date().toISOString(),
		}),
		getState: vi.fn().mockReturnValue({
			state: "idle",
			isOnline: true,
			lastSyncAt: null,
			lastSyncResult: null,
			pendingCount: 0,
			errorMessage: null,
		}),
	};
}
