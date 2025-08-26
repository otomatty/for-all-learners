/**
 * JSONContent内のMarkdownテーブルを検出・変換する機能
 *
 * 既存のtransformDollarInDocと同様のパターンで、
 * テキストノード内のMarkdownテーブル記法を検出し、
 * TiptapのTable Nodeに変換する
 */

import type { JSONContent } from "@tiptap/core";
import { type TableData, findMarkdownTables } from "./markdownTableParser";

// 型定義: textノード用の拡張インターフェース
interface JSONTextNode extends JSONContent {
	type: "text";
	text: string;
	marks?: Array<{ type: string; [key: string]: unknown }>;
}

/**
 * TableDataをTiptapのJSONContent形式に変換
 */
function tableDataToJSONContent(tableData: TableData): JSONContent {
	const { headers, alignments, rows } = tableData;

	// ヘッダー行の作成
	const headerRow: JSONContent = {
		type: "tableRow",
		content: headers.map((header, index) => ({
			type: "tableHeader",
			attrs: {
				colspan: 1,
				rowspan: 1,
				colwidth: null,
				// アライメント情報を属性として保存
				textAlign: alignments[index] || "left",
			},
			content: [
				{
					type: "paragraph",
					content: header.trim() ? [{ type: "text", text: header.trim() }] : [],
				},
			],
		})),
	};

	// データ行の作成
	const dataRows: JSONContent[] = rows.map((row) => ({
		type: "tableRow",
		content: row.map((cell, index) => ({
			type: "tableCell",
			attrs: {
				colspan: 1,
				rowspan: 1,
				colwidth: null,
				// アライメント情報を属性として保存
				textAlign: alignments[index] || "left",
			},
			content: [
				{
					type: "paragraph",
					content: cell.trim() ? [{ type: "text", text: cell.trim() }] : [],
				},
			],
		})),
	}));

	// テーブル全体の作成
	return {
		type: "table",
		content: [headerRow, ...dataRows],
	};
}

/**
 * 単一のテキストノードを処理し、Markdownテーブルを検出・変換
 */
function transformTextNode(node: JSONTextNode): JSONContent[] {
	const { text, marks } = node;

	// Markdownテーブルを検出
	const tableMatches = findMarkdownTables(text);

	if (tableMatches.length === 0) {
		// テーブルが見つからない場合は元のノードをそのまま返す
		return [node];
	}

	const result: JSONContent[] = [];
	let lastIndex = 0;

	// 検出されたテーブルを順番に処理
	for (const match of tableMatches) {
		const { startIndex, endIndex, tableData } = match;

		// テーブル前のテキストを追加
		if (startIndex > lastIndex) {
			const beforeText = text.slice(lastIndex, startIndex);
			if (beforeText.trim()) {
				result.push({
					type: "text",
					text: beforeText,
					marks,
				});
			}
		}

		// テーブルノードを追加
		const tableNode = tableDataToJSONContent(tableData);
		result.push(tableNode);

		lastIndex = endIndex;
	}

	// テーブル後の残りテキストを追加
	if (lastIndex < text.length) {
		const afterText = text.slice(lastIndex);
		if (afterText.trim()) {
			result.push({
				type: "text",
				text: afterText,
				marks,
			});
		}
	}

	return result.length > 0 ? result : [node];
}

/**
 * JSONContentノードを再帰的に処理してMarkdownテーブルを変換
 */
function transformNode(node: JSONContent): JSONContent[] {
	// テキストノードの場合、Markdownテーブルを検出・変換
	if (node.type === "text") {
		return transformTextNode(node as JSONTextNode);
	}

	// 子ノードを持つ場合は再帰的に処理
	if (node.content && Array.isArray(node.content)) {
		const transformedChildren = node.content.flatMap((child) =>
			transformNode(child as JSONContent),
		);

		// 変換後の子ノードで更新
		return [{ ...node, content: transformedChildren }];
	}

	// その他のノードはそのまま返す
	return [node];
}

/**
 * JSONContent文書内のMarkdownテーブルを検出・変換
 *
 * 使用例:
 * ```typescript
 * const doc = {
 *   type: "doc",
 *   content: [
 *     {
 *       type: "paragraph",
 *       content: [
 *         {
 *           type: "text",
 *           text: "| Name | Age |\n|------|-----|\n| John | 25 |\n| Jane | 30 |"
 *         }
 *       ]
 *     }
 *   ]
 * };
 *
 * const transformed = transformMarkdownTables(doc);
 * ```
 */
export function transformMarkdownTables(doc: JSONContent): JSONContent {
	try {
		// ドキュメントをクローンして元を保護
		const clone = structuredClone(doc) as JSONContent;

		// 子ノードを変換
		if (clone.content && Array.isArray(clone.content)) {
			clone.content = clone.content.flatMap((child) =>
				transformNode(child as JSONContent),
			);
		}

		return clone;
	} catch (error) {
		console.error("Markdownテーブル変換でエラーが発生:", error);
		// エラー時は元のドキュメントを返す
		return doc;
	}
}

/**
 * 単一の段落ノード内でMarkdownテーブルを検出・変換
 * （特定の段落のみを対象にする場合に使用）
 */
export function transformMarkdownTablesInParagraph(
	paragraph: JSONContent,
): JSONContent[] {
	if (paragraph.type !== "paragraph" || !paragraph.content) {
		return [paragraph];
	}

	const transformedContent = paragraph.content.flatMap((child) =>
		transformNode(child as JSONContent),
	);

	// 変換後にテーブルが含まれる場合は、段落を分割
	const result: JSONContent[] = [];
	let currentParagraphContent: JSONContent[] = [];

	for (const content of transformedContent) {
		if (content.type === "table") {
			// 現在の段落内容があれば追加
			if (currentParagraphContent.length > 0) {
				result.push({
					...paragraph,
					content: currentParagraphContent,
				});
				currentParagraphContent = [];
			}

			// テーブルを追加
			result.push(content);
		} else {
			// 段落内容として追加
			currentParagraphContent.push(content);
		}
	}

	// 残りの段落内容があれば追加
	if (currentParagraphContent.length > 0) {
		result.push({
			...paragraph,
			content: currentParagraphContent,
		});
	}

	return result.length > 0 ? result : [paragraph];
}

/**
 * 文字列内にMarkdownテーブルが含まれているかチェック
 */
export function hasMarkdownTable(text: string): boolean {
	const matches = findMarkdownTables(text);
	return matches.length > 0;
}

/**
 * JSONContent内にMarkdownテーブルが含まれているかチェック
 */
export function hasMarkdownTableInContent(doc: JSONContent): boolean {
	function checkNode(node: JSONContent): boolean {
		if (node.type === "text" && typeof node.text === "string") {
			return hasMarkdownTable(node.text);
		}

		if (node.content && Array.isArray(node.content)) {
			return node.content.some((child) => checkNode(child as JSONContent));
		}

		return false;
	}

	return checkNode(doc);
}
