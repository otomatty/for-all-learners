/**
 * Repository エラーメッセージユーティリティ
 *
 * RepositoryErrorをi18n対応のエラーメッセージに変換するユーティリティ
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ hooks/notes/*.ts
 *   └─ hooks/decks/*.ts
 *
 * Dependencies:
 *   └─ lib/repositories/types.ts
 *
 * Spec: lib/repositories/repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/198
 */

import { RepositoryError } from "./base-repository";
import type { EntityName, RepositoryErrorCode } from "./types";

/**
 * エンティティ名の日本語マッピング
 * フォールバック用（翻訳ファイルが使えない場合）
 */
const ENTITY_NAME_JA: Record<EntityName, string> = {
	notes: "ノート",
	pages: "ページ",
	decks: "デッキ",
	cards: "カード",
	studyGoals: "学習目標",
	learningLogs: "学習ログ",
	milestones: "マイルストーン",
	userSettings: "ユーザー設定",
};

/**
 * エンティティ名の英語マッピング
 * フォールバック用（翻訳ファイルが使えない場合）
 */
const ENTITY_NAME_EN: Record<EntityName, string> = {
	notes: "note",
	pages: "page",
	decks: "deck",
	cards: "card",
	studyGoals: "study goal",
	learningLogs: "learning log",
	milestones: "milestone",
	userSettings: "user settings",
};

/**
 * エラーコードの日本語マッピング
 * フォールバック用（翻訳ファイルが使えない場合）
 */
const ERROR_MESSAGE_JA: Record<RepositoryErrorCode, string> = {
	NOT_FOUND: "データが見つかりません",
	VALIDATION_ERROR: "入力内容に問題があります",
	DB_ERROR: "データベースエラーが発生しました",
	SYNC_ERROR: "同期エラーが発生しました",
};

/**
 * エラーコードの英語マッピング
 * フォールバック用（翻訳ファイルが使えない場合）
 */
const ERROR_MESSAGE_EN: Record<RepositoryErrorCode, string> = {
	NOT_FOUND: "Data not found",
	VALIDATION_ERROR: "There is an issue with the input",
	DB_ERROR: "Database error occurred",
	SYNC_ERROR: "Sync error occurred",
};

/**
 * i18n翻訳キー情報
 */
export interface ErrorTranslationKey {
	/** 翻訳キー（例: "errors.repository.NOT_FOUND"） */
	key: string;
	/** 変数（例: { entity: "note" }） */
	values?: Record<string, string>;
}

/**
 * RepositoryErrorからi18n翻訳キー情報を取得
 *
 * @param error RepositoryError
 * @returns 翻訳キー情報
 */
export function getErrorTranslationKey(
	error: RepositoryError,
): ErrorTranslationKey {
	const entityName = error.details?.entityName;

	// エンティティ名がある場合は詳細なメッセージ
	if (entityName) {
		return {
			key: `errors.repository.${error.code}`,
			values: {
				entity: entityName,
			},
		};
	}

	// 基本的なエラーコードのみ
	return {
		key: `errors.repository.${error.code}`,
	};
}

/**
 * RepositoryErrorからフォールバックメッセージを取得
 * 翻訳ファイルが使えない場合に使用
 *
 * @param error RepositoryError
 * @param locale ロケール（"ja" | "en"）
 * @returns フォールバックメッセージ
 */
export function getErrorFallbackMessage(
	error: RepositoryError,
	locale: "ja" | "en" = "ja",
): string {
	const errorMessages = locale === "ja" ? ERROR_MESSAGE_JA : ERROR_MESSAGE_EN;
	const entityNames = locale === "ja" ? ENTITY_NAME_JA : ENTITY_NAME_EN;

	const baseMessage = errorMessages[error.code] ?? error.message;
	const entityName = error.details?.entityName as EntityName | undefined;

	if (entityName) {
		const localizedEntityName = entityNames[entityName] ?? entityName;
		return `${localizedEntityName}: ${baseMessage}`;
	}

	return baseMessage;
}

/**
 * エラーがRepositoryErrorかどうかを判定
 *
 * @param error エラー
 * @returns RepositoryErrorかどうか
 */
export function isRepositoryError(error: unknown): error is RepositoryError {
	return error instanceof RepositoryError;
}

/**
 * エラーからユーザー向けメッセージを取得
 * RepositoryErrorの場合はi18n対応、それ以外は汎用メッセージ
 *
 * @param error エラー
 * @param locale ロケール
 * @returns ユーザー向けメッセージ
 */
export function getUserFriendlyErrorMessage(
	error: unknown,
	locale: "ja" | "en" = "ja",
): string {
	if (isRepositoryError(error)) {
		return getErrorFallbackMessage(error, locale);
	}

	if (error instanceof Error) {
		// 認証エラー
		if (error.message.includes("not authenticated")) {
			return locale === "ja" ? "認証されていません" : "Not authenticated";
		}

		return error.message;
	}

	return locale === "ja"
		? "予期しないエラーが発生しました"
		: "An unexpected error occurred";
}
