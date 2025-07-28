"use server";

import {
	DEFAULT_PAGE_INFO_PROMPT,
	DEFAULT_WIKI_PROMPT,
} from "@/lib/promptDefaults";
import { getUserPromptTemplate } from "./promptTemplate";

/**
 * 指定したプロンプトキーに対応するテンプレートを取得し、存在しない場合はデフォルトを返します。
 * @param promptKey - プロンプトキー
 * @returns テンプレート文字列
 */
export async function getPromptTemplate(promptKey: string): Promise<string> {
	// ユーザー設定のテンプレートを取得
	const row = await getUserPromptTemplate(promptKey);
	if (row?.template) {
		return row.template;
	}
	// デフォルトのテンプレートにフォールバック
	switch (promptKey) {
		case "page_wiki":
			return DEFAULT_WIKI_PROMPT;
		case "page_info":
			return DEFAULT_PAGE_INFO_PROMPT;
		default:
			throw new Error(`テンプレートが見つかりません: ${promptKey}`);
	}
}
