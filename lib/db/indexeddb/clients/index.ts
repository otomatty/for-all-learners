/**
 * IndexedDB クライアント エクスポート
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/db/indexeddb/index.ts
 *
 * Dependencies:
 *   ├─ lib/db/indexeddb/clients/notes.ts
 *   ├─ lib/db/indexeddb/clients/pages.ts
 *   ├─ lib/db/indexeddb/clients/decks.ts
 *   ├─ lib/db/indexeddb/clients/cards.ts
 *   ├─ lib/db/indexeddb/clients/study-goals.ts
 *   ├─ lib/db/indexeddb/clients/learning-logs.ts
 *   ├─ lib/db/indexeddb/clients/milestones.ts
 *   └─ lib/db/indexeddb/clients/user-settings.ts
 */

export { cardsClient } from "./cards";
export { decksClient } from "./decks";
export { learningLogsClient } from "./learning-logs";
export { milestonesClient } from "./milestones";
export { notesClient } from "./notes";
export { pagesClient } from "./pages";
export { studyGoalsClient } from "./study-goals";
export { userSettingsClient } from "./user-settings";
