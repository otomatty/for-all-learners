/**
 * 同期キュー
 *
 * オフライン時の変更をキューに保存し、オンライン復帰時に順次処理する
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/sync/sync-manager.ts
 *
 * Dependencies:
 *   └─ lib/sync/types.ts
 *
 * Spec: lib/sync/sync.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/193
 */

import type { SyncableEntity } from "@/lib/db/types";
import type { SyncOperation, SyncQueueItem, SyncTableName } from "./types";

/**
 * 同期キュークラス
 *
 * - オフライン時の変更をキューに保存
 * - FIFO（先入れ先出し）で処理
 * - リトライ機能付き
 * - localStorage に永続化
 */
export class SyncQueue {
	private queue: SyncQueueItem[] = [];
	private readonly storageKey = "for-all-learners-sync-queue";
	private readonly maxRetries: number;

	constructor(maxRetries = 3) {
		this.maxRetries = maxRetries;
		this.loadFromStorage();
	}

	/**
	 * localStorage からキューを読み込み
	 */
	private loadFromStorage(): void {
		if (typeof window === "undefined") return;

		try {
			const stored = localStorage.getItem(this.storageKey);
			if (stored) {
				this.queue = JSON.parse(stored);
			}
		} catch {
			// パースエラー時は空のキューで開始
			this.queue = [];
		}
	}

	/**
	 * キューを localStorage に保存
	 */
	private saveToStorage(): void {
		if (typeof window === "undefined") return;

		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
		} catch {
			// ストレージがいっぱいの場合は古いアイテムを削除
			if (this.queue.length > 100) {
				this.queue = this.queue.slice(-50);
				localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
			}
		}
	}

	/**
	 * UUIDを生成
	 */
	private generateId(): string {
		return crypto.randomUUID();
	}

	/**
	 * アイテムをキューに追加
	 *
	 * @param table テーブル名
	 * @param operation 操作種類
	 * @param entityId エンティティID
	 * @param data データ（create/update時）
	 */
	enqueue(
		table: SyncTableName,
		operation: SyncOperation,
		entityId: string,
		data: SyncableEntity | null = null,
	): SyncQueueItem {
		// 同じエンティティの既存アイテムを確認
		const existingIndex = this.queue.findIndex(
			(item) => item.table === table && item.entityId === entityId,
		);

		// 既存アイテムがある場合は操作をマージ
		if (existingIndex !== -1) {
			const existing = this.queue[existingIndex];

			// delete が後から来た場合は delete で上書き
			if (operation === "delete") {
				this.queue[existingIndex] = {
					...existing,
					operation: "delete",
					data: null,
					timestamp: new Date().toISOString(),
				};
				this.saveToStorage();
				return this.queue[existingIndex];
			}

			// create → update は create のまま（新規作成として扱う）
			if (existing.operation === "create" && operation === "update") {
				this.queue[existingIndex] = {
					...existing,
					data,
					timestamp: new Date().toISOString(),
				};
				this.saveToStorage();
				return this.queue[existingIndex];
			}

			// update → update は最新の update で上書き
			if (existing.operation === "update" && operation === "update") {
				this.queue[existingIndex] = {
					...existing,
					data,
					timestamp: new Date().toISOString(),
				};
				this.saveToStorage();
				return this.queue[existingIndex];
			}
		}

		// 新規アイテムを追加
		const item: SyncQueueItem = {
			id: this.generateId(),
			table,
			operation,
			entityId,
			data,
			timestamp: new Date().toISOString(),
			retryCount: 0,
			maxRetries: this.maxRetries,
		};

		this.queue.push(item);
		this.saveToStorage();

		return item;
	}

	/**
	 * キューの先頭からアイテムを取得（削除はしない）
	 */
	peek(): SyncQueueItem | undefined {
		return this.queue[0];
	}

	/**
	 * キューの先頭からアイテムを取得して削除
	 */
	dequeue(): SyncQueueItem | undefined {
		const item = this.queue.shift();
		this.saveToStorage();
		return item;
	}

	/**
	 * 指定したIDのアイテムを削除
	 */
	remove(id: string): boolean {
		const index = this.queue.findIndex((item) => item.id === id);
		if (index === -1) return false;

		this.queue.splice(index, 1);
		this.saveToStorage();
		return true;
	}

	/**
	 * リトライ回数を増やして再キュー
	 */
	retry(id: string): boolean {
		const index = this.queue.findIndex((item) => item.id === id);
		if (index === -1) return false;

		const item = this.queue[index];
		if (item.retryCount >= item.maxRetries) {
			// 最大リトライ回数に達した場合は削除
			this.queue.splice(index, 1);
			this.saveToStorage();
			return false;
		}

		// リトライ回数を増やしてキューの最後に移動
		item.retryCount++;
		item.timestamp = new Date().toISOString();
		this.queue.splice(index, 1);
		this.queue.push(item);
		this.saveToStorage();

		return true;
	}

	/**
	 * キューの全アイテムを取得
	 */
	getAll(): SyncQueueItem[] {
		return [...this.queue];
	}

	/**
	 * テーブル別にアイテムを取得
	 */
	getByTable(table: SyncTableName): SyncQueueItem[] {
		return this.queue.filter((item) => item.table === table);
	}

	/**
	 * キューのアイテム数を取得
	 */
	size(): number {
		return this.queue.length;
	}

	/**
	 * キューが空かどうか
	 */
	isEmpty(): boolean {
		return this.queue.length === 0;
	}

	/**
	 * キューをクリア
	 */
	clear(): void {
		this.queue = [];
		this.saveToStorage();
	}

	/**
	 * 指定した数のアイテムをバッチで取得
	 */
	getBatch(size: number): SyncQueueItem[] {
		return this.queue.slice(0, size);
	}

	/**
	 * 複数のアイテムを一括削除
	 */
	removeBatch(ids: string[]): number {
		const idSet = new Set(ids);
		const originalLength = this.queue.length;
		this.queue = this.queue.filter((item) => !idSet.has(item.id));
		this.saveToStorage();
		return originalLength - this.queue.length;
	}
}

/**
 * デフォルトの同期キューインスタンス
 */
export const syncQueue = new SyncQueue();
