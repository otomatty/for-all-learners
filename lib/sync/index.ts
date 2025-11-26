/**
 * 同期機能のエントリーポイント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ components/providers/sync-provider.tsx (将来)
 *   ├─ hooks/sync/*.ts (将来)
 *   └─ app/(protected)/layout.tsx (将来)
 *
 * Dependencies:
 *   ├─ lib/sync/types.ts
 *   ├─ lib/sync/sync-manager.ts
 *   ├─ lib/sync/conflict-resolver.ts
 *   ├─ lib/sync/sync-queue.ts
 *   └─ lib/sync/sync-triggers.ts
 *
 * Spec: lib/sync/sync.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/193
 */

// 競合解決
export { ConflictResolver, conflictResolver } from "./conflict-resolver";
// 同期マネージャー
export { SyncManager, syncManager } from "./sync-manager";
// 同期キュー
export { SyncQueue, syncQueue } from "./sync-queue";
// 同期トリガー
export {
	DEFAULT_SYNC_TRIGGER_CONFIG,
	registerBackgroundSync,
	registerPeriodicBackgroundSync,
	type SyncTriggerConfig,
	setupBeforeUnloadSync,
	setupSyncTriggers,
} from "./sync-triggers";
// 型定義
export type {
	ConflictData,
	ConflictWinner,
	PullResult,
	PushResult,
	ServerCard,
	ServerDeck,
	ServerNote,
	ServerPage,
	SyncConfig,
	SyncEvent,
	SyncEventListener,
	SyncEventType,
	SyncManagerState,
	SyncOperation,
	SyncQueueItem,
	SyncResult,
	SyncState,
	SyncTableName,
} from "./types";
// 型ガード
export {
	DEFAULT_SYNC_CONFIG,
	isLocalCard,
	isLocalDeck,
	isLocalLearningLog,
	isLocalMilestone,
	isLocalNote,
	isLocalPage,
	isLocalStudyGoal,
	isLocalUserSettings,
} from "./types";
