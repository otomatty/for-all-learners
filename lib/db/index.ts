/**
 * ローカルDB モジュール
 *
 * Web環境（IndexedDB）とTauri環境（SQLite）をサポートする
 * ハイブリッドローカルデータベースクライアント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ hooks/notes/*.ts (将来)
 *   ├─ hooks/pages/*.ts (将来)
 *   ├─ hooks/decks/*.ts (将来)
 *   ├─ hooks/cards/*.ts (将来)
 *   └─ lib/db/sync-manager.ts (Phase B で作成)
 *
 * Dependencies:
 *   ├─ lib/db/types.ts
 *   ├─ lib/db/indexeddb-client.ts
 *   └─ lib/db/hybrid-client.ts
 *
 * Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/190
 */

// ハイブリッドクライアントのエクスポート
export {
	type CardsClientInterface,
	clearDBClientCache,
	clearLocalDB,
	type DecksClientInterface,
	getAllPendingSync,
	getDBClient,
	getPendingSyncCount,
	type HybridDBClientInterface,
	isIndexedDBAvailable,
	isServer,
	isTauri,
	type LearningLogsClientInterface,
	type MilestonesClientInterface,
	type NotesClientInterface,
	type PagesClientInterface,
	type StudyGoalsClientInterface,
	type UserSettingsClientInterface,
} from "./hybrid-client";

// クライアントのエクスポート
export {
	cardsClient,
	closeLocalDB,
	decksClient,
	getLocalDB,
	indexedDBClient,
	learningLogsClient,
	milestonesClient,
	notesClient,
	pagesClient,
	studyGoalsClient,
	userSettingsClient,
} from "./indexeddb-client";
// 型定義のエクスポート
export * from "./types";
