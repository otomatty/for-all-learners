/**
 * Repository モジュール エントリーポイント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ hooks/notes/*.ts
 *   ├─ hooks/pages/*.ts
 *   ├─ hooks/decks/*.ts
 *   └─ hooks/cards/*.ts
 *
 * Spec: lib/repositories/repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/195
 */

// Base Repository
export { BaseRepository, RepositoryError } from "./base-repository";
export {
	CardsRepository,
	cardsRepository,
	type ReviewResult,
} from "./cards-repository";
export { DecksRepository, decksRepository } from "./decks-repository";
// Error Utilities
export {
	type ErrorTranslationKey,
	getErrorFallbackMessage,
	getErrorTranslationKey,
	getUserFriendlyErrorMessage,
	isRepositoryError,
} from "./error-messages";
// Entity Repositories
export { NotesRepository, notesRepository } from "./notes-repository";
export { PagesRepository, pagesRepository } from "./pages-repository";
// Types
export type {
	EntityName,
	Repository,
	RepositoryErrorCode,
	RepositoryErrorDetails,
	RepositoryOptions,
	SyncMetadataKeys,
} from "./types";
export { DEFAULT_REPOSITORY_OPTIONS } from "./types";
