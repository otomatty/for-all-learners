/**
 * PDF処理用のユーティリティ関数
 *
 * Server Actionsファイルから分離した同期関数群
 */

import type { Json } from "@/types/database.types";

export interface PdfProblem {
	id: string;
	problemText: string;
	answerText?: string;
	explanationText?: string;
	problemType: "multiple_choice" | "descriptive" | "calculation" | "unknown";
	confidence: number;
	pageNumber: number;
	chunkId: string;
}

/**
 * 重複問題の除去
 *
 * @description 問題文の正規化による重複検出と除去を行う
 * @param problems - 除去対象の問題配列
 * @returns 重複を除去した問題配列
 */
export function removeDuplicateProblems(problems: PdfProblem[]): PdfProblem[] {
	const uniqueProblems: PdfProblem[] = [];
	const seenTexts = new Set<string>();
	let tooShortCount = 0;
	let duplicateCount = 0;

	for (const problem of problems) {
		// 問題文の正規化（空白・改行を統一）
		const normalizedText = problem.problemText
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();

		if (normalizedText.length <= 10) {
			tooShortCount++;
			continue;
		}

		if (seenTexts.has(normalizedText)) {
			duplicateCount++;
			continue;
		}

		seenTexts.add(normalizedText);
		uniqueProblems.push(problem);
	}

	console.log(
		`[重複除去] ${problems.length}個 → ${uniqueProblems.length}個（短すぎる: ${tooShortCount}個、重複: ${duplicateCount}個を除外）`,
	);
	return uniqueProblems;
}

/**
 * プレーンテキストからTiptapJSON形式への変換
 *
 * @description テキストをTiptapエディタで使用可能なJSON形式に変換
 * @param text - 変換対象のプレーンテキスト
 * @returns TiptapJSON形式のオブジェクト
 */
export function convertTextToTiptapJSON(text: string): Json {
	// 改行で段落を分割
	const paragraphs = text.split("\n").filter((line) => line.trim());

	const content = paragraphs.map((paragraph) => ({
		type: "paragraph",
		content: [
			{
				type: "text",
				text: paragraph.trim(),
			},
		],
	}));

	return {
		type: "doc",
		content:
			content.length > 0
				? content
				: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: text.trim(),
								},
							],
						},
					],
	} as Json;
}

/**
 * トークン数の推定
 *
 * @description 日本語テキストのトークン数を大まかに推定
 * @param text - トークン数を計算するテキスト
 * @returns 推定トークン数
 */
export function estimateTokenCount(text: string): number {
	// 日本語の場合、文字数の約0.75倍がトークン数の目安
	// 英語の場合、単語数の約1.3倍がトークン数の目安
	const japaneseChars = (
		text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []
	).length;
	const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
	const otherChars = text.length - japaneseChars - englishWords;

	return Math.ceil(
		japaneseChars * 0.75 + englishWords * 1.3 + otherChars * 0.5,
	);
}

/**
 * チャンクIDの生成
 *
 * @description ページ番号の配列からユニークなチャンクIDを生成
 * @param pageNumbers - ページ番号の配列
 * @returns チャンクID
 */
export function generateChunkId(pageNumbers: number[]): string {
	const sortedPages = [...pageNumbers].sort((a, b) => a - b);
	return `chunk_${sortedPages.join("-")}_${Date.now()}`;
}

/**
 * 問題IDの生成
 *
 * @description 問題の内容とメタデータからユニークなIDを生成
 * @param problemText - 問題文
 * @param pageNumber - ページ番号
 * @returns 問題ID
 */
export function generateProblemId(
	problemText: string,
	pageNumber: number,
): string {
	// 問題文の最初の50文字をハッシュ化（簡易版）
	const textHash = problemText.slice(0, 50).replace(/\s+/g, "").toLowerCase();
	const timestamp = Date.now();
	return `prob_p${pageNumber}_${textHash.slice(0, 10)}_${timestamp}`;
}
