/**
 * IndexedDB クライアント
 *
 * Web環境用のローカルデータベースクライアント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/db/hybrid-client.ts
 *
 * Dependencies:
 *   ├─ lib/db/indexeddb/connection.ts
 *   └─ lib/db/indexeddb/clients/index.ts
 *
 * Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/190
 */

export {
	cardsClient,
	decksClient,
	learningLogsClient,
	milestonesClient,
	notesClient,
	pagesClient,
	studyGoalsClient,
	userSettingsClient,
} from "./clients";
export { closeLocalDB, getLocalDB } from "./connection";

// Re-export utils for external use if needed
export {
	generateUUID,
	initSyncMetadata,
	now,
	updateSyncMetadata,
} from "./utils";

import {
	cardsClient,
	decksClient,
	learningLogsClient,
	milestonesClient,
	notesClient,
	pagesClient,
	studyGoalsClient,
	userSettingsClient,
} from "./clients";
// Aggregated client export
import { closeLocalDB, getLocalDB } from "./connection";

/**
 * IndexedDB クライアント
 */
export const indexedDBClient = {
	notes: notesClient,
	pages: pagesClient,
	decks: decksClient,
	cards: cardsClient,
	studyGoals: studyGoalsClient,
	learningLogs: learningLogsClient,
	milestones: milestonesClient,
	userSettings: userSettingsClient,
	getDB: getLocalDB,
	closeDB: closeLocalDB,
};
