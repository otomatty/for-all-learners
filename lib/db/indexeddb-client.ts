/**
 * IndexedDB クライアント（後方互換性のための re-export）
 *
 * @deprecated lib/db/indexeddb/index.ts からインポートしてください
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/db/hybrid-client.ts
 *
 * Dependencies:
 *   └─ lib/db/indexeddb/index.ts
 */

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
} from "./indexeddb";
