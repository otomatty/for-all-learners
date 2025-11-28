"use client";

/**
 * useRepositoryError フック
 *
 * RepositoryErrorをi18n対応のエラーメッセージに変換するカスタムフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ hooks/notes/*.tsx
 *   └─ hooks/decks/*.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/error-messages.ts
 *   └─ next-intl
 *
 * Related Documentation:
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/198
 */

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import {
	type ErrorTranslationKey,
	getErrorTranslationKey,
	getUserFriendlyErrorMessage,
	isRepositoryError,
} from "@/lib/repositories";

/**
 * useRepositoryError フックの戻り値
 */
export interface UseRepositoryErrorResult {
	/**
	 * エラーをi18n対応のメッセージに変換
	 * @param error エラー
	 * @returns i18n対応のエラーメッセージ
	 */
	getErrorMessage: (error: unknown) => string;

	/**
	 * RepositoryErrorから翻訳キー情報を取得
	 * @param error エラー
	 * @returns 翻訳キー情報、またはnull
	 */
	getTranslationKey: (error: unknown) => ErrorTranslationKey | null;
}

/**
 * RepositoryErrorをi18n対応のエラーメッセージに変換するカスタムフック
 *
 * @example
 * ```tsx
 * const { getErrorMessage } = useRepositoryError();
 *
 * if (error) {
 *   toast.error(getErrorMessage(error));
 * }
 * ```
 */
export function useRepositoryError(): UseRepositoryErrorResult {
	const t = useTranslations("errors");

	const getErrorMessage = useCallback(
		(error: unknown): string => {
			if (isRepositoryError(error)) {
				const translationInfo = getErrorTranslationKey(error);

				try {
					// 翻訳キーを使ってメッセージを取得
					const key = translationInfo.key.replace("errors.", "");
					if (translationInfo.values) {
						return t(key, translationInfo.values);
					}
					return t(key);
				} catch {
					// 翻訳キーが見つからない場合はフォールバック
					return getUserFriendlyErrorMessage(error, "ja");
				}
			}

			if (error instanceof Error) {
				// 認証エラー
				if (error.message.includes("not authenticated")) {
					try {
						return t("auth.notAuthenticated");
					} catch {
						return "認証されていません";
					}
				}
				return error.message;
			}

			try {
				return t("serverError");
			} catch {
				return "予期しないエラーが発生しました";
			}
		},
		[t],
	);

	const getTranslationKey = useCallback(
		(error: unknown): ErrorTranslationKey | null => {
			if (isRepositoryError(error)) {
				return getErrorTranslationKey(error);
			}
			return null;
		},
		[],
	);

	return {
		getErrorMessage,
		getTranslationKey,
	};
}
