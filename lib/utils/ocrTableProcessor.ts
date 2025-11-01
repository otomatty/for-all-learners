/**
 * OCRテキストをMarkdownテーブル形式に変換する後処理機能
 *
 * OCRで読み取ったテーブル形式のテキストを、
 * 正しいMarkdownテーブル記法に自動修正する
 */

import type { TableData } from "./markdownTableParser";

export interface OcrTableProcessingOptions {
	/** 最小列数 (デフォルト: 2) */
	minColumns?: number;
	/** 最大列数 (デフォルト: 10) */
	maxColumns?: number;
	/** セル区切り文字の候補 */
	separators?: string[];
	/** 自動列数調整を有効にするか */
	autoAdjustColumns?: boolean;
	/** デバッグモードを有効にするか */
	debug?: boolean;
}

export interface OcrTableResult {
	/** 変換されたMarkdownテーブル */
	markdownTable?: string;
	/** パースされたテーブルデータ */
	tableData?: TableData;
	/** 変換が成功したか */
	success: boolean;
	/** 警告メッセージ */
	warnings: string[];
	/** 元のテキスト */
	originalText: string;
}

const DEFAULT_OPTIONS: Required<OcrTableProcessingOptions> = {
	minColumns: 2,
	maxColumns: 10,
	separators: ["|", "｜", "l", "I", "1", "│", "┃", "︱"],
	autoAdjustColumns: true,
	debug: false,
};

/**
 * OCRテキストからテーブル構造を検出・修正
 */
export function processOcrTable(
	ocrText: string,
	options: OcrTableProcessingOptions = {},
): OcrTableResult {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const warnings: string[] = [];

	if (opts.debug) {
	}

	try {
		// 1. テキストの前処理
		const preprocessed = preprocessOcrText(ocrText, opts);
		if (opts.debug) {
		}

		// 2. テーブル行の検出
		const tableLines = detectTableLines(preprocessed, opts);
		if (tableLines.length < 2) {
			return {
				success: false,
				warnings: ["テーブル構造が検出されませんでした"],
				originalText: ocrText,
			};
		}

		// 3. セル区切りの正規化
		const normalizedLines = normalizeTableSeparators(tableLines, opts);

		// 4. 列数の統一
		const unifiedLines = unifyColumnCount(normalizedLines, opts, warnings);

		// 5. Markdownテーブル形式に変換
		const markdownTable = convertToMarkdownTable(unifiedLines, opts);

		// 6. 変換結果をパース（検証用）
		const { parseMarkdownTable } = require("./markdownTableParser");
		const tableData = parseMarkdownTable(markdownTable);

		if (opts.debug) {
		}

		return {
			markdownTable,
			tableData: tableData || undefined,
			success: !!tableData,
			warnings,
			originalText: ocrText,
		};
	} catch (error) {
		return {
			success: false,
			warnings: [
				`処理エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
			],
			originalText: ocrText,
		};
	}
}

/**
 * OCRテキストの前処理
 */
function preprocessOcrText(
	text: string,
	_options: Required<OcrTableProcessingOptions>,
): string {
	return (
		text
			// 全角英数字を半角に
			.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
				String.fromCharCode(char.charCodeAt(0) - 0xfee0),
			)
			// 不要な空白文字を統一
			.replace(/[\u00A0\u2000-\u200B\u2028\u2029]/g, " ")
			// 連続する空白を単一のスペースに
			.replace(/\s+/g, " ")
			// 行の前後の空白を除去
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.join("\n")
	);
}

/**
 * テーブル行を検出
 */
function detectTableLines(
	text: string,
	options: Required<OcrTableProcessingOptions>,
): string[] {
	const lines = text.split("\n");
	const tableLines: string[] = [];

	for (const line of lines) {
		// セル区切り文字が含まれている行をテーブル行と判定
		const hasSeparator = options.separators.some((sep) => line.includes(sep));

		if (hasSeparator) {
			// 明らかなアライメント行（--- の組み合わせ）をスキップ
			const isAlignmentRow = /^[\s|\-:]+$/.test(line);
			if (!isAlignmentRow) {
				tableLines.push(line);
			}
		}
	}

	return tableLines;
}

/**
 * セル区切り文字を正規化（すべて | に統一）
 */
function normalizeTableSeparators(
	lines: string[],
	options: Required<OcrTableProcessingOptions>,
): string[] {
	return lines.map((line) => {
		let normalized = line;

		// 区切り文字候補をすべて | に置換
		for (const separator of options.separators) {
			if (separator !== "|") {
				normalized = normalized.replace(new RegExp(`\\${separator}`, "g"), "|");
			}
		}

		// 連続する | を単一の | に
		normalized = normalized.replace(/\|+/g, "|");

		// 行の前後に | がない場合は追加
		if (!normalized.startsWith("|")) {
			normalized = `|${normalized}`;
		}
		if (!normalized.endsWith("|")) {
			normalized = `${normalized}|`;
		}

		return normalized;
	});
}

/**
 * 列数を統一（最頻出の列数に合わせる）
 */
function unifyColumnCount(
	lines: string[],
	options: Required<OcrTableProcessingOptions>,
	warnings: string[],
): string[] {
	// 各行の列数をカウント
	const columnCounts = lines.map((line) => {
		const cells = line.split("|").filter((cell) => cell.trim().length > 0);
		return cells.length;
	});

	// 最頻出の列数を決定
	const countFrequency = new Map<number, number>();
	for (const count of columnCounts) {
		countFrequency.set(count, (countFrequency.get(count) || 0) + 1);
	}

	const targetColumnCount = Math.max(
		...(Array.from(countFrequency.entries()).sort((a, b) => b[1] - a[1])[0] || [
			options.minColumns,
		]),
	);

	if (
		targetColumnCount < options.minColumns ||
		targetColumnCount > options.maxColumns
	) {
		warnings.push(
			`列数 ${targetColumnCount} が範囲外です (${options.minColumns}-${options.maxColumns})`,
		);
	}

	// 各行を目標列数に調整
	return lines.map((line, index) => {
		const cells = line.split("|").filter((cell) => cell.trim().length > 0);
		const currentCount = cells.length;

		if (currentCount === targetColumnCount) {
			return line;
		}

		if (currentCount < targetColumnCount) {
			// 列数が不足している場合は空セルを追加
			const emptyCells = Array(targetColumnCount - currentCount).fill("");
			const adjustedCells = [...cells, ...emptyCells];
			return `| ${adjustedCells.join(" | ")} |`;
		}

		// 列数が多い場合は末尾をカット
		warnings.push(`行${index + 1}: 列数超過のため末尾をカットしました`);
		const adjustedCells = cells.slice(0, targetColumnCount);
		return `| ${adjustedCells.join(" | ")} |`;
	});
}

/**
 * Markdownテーブル形式に変換
 */
function convertToMarkdownTable(
	lines: string[],
	_options: Required<OcrTableProcessingOptions>,
): string {
	if (lines.length === 0) {
		throw new Error("変換する行がありません");
	}

	// 最初の行をヘッダーとして扱う
	const headerLine = lines[0];
	const dataLines = lines.slice(1);

	// ヘッダーから列数を決定
	const headerCells = headerLine
		.split("|")
		.filter((cell) => cell.trim().length > 0)
		.map((cell) => cell.trim());

	const columnCount = headerCells.length;

	// アライメント行を生成（すべて左寄せ）
	const alignmentLine = `| ${Array(columnCount).fill("---").join(" | ")} |`;

	// 結果を組み立て
	const markdownLines = [headerLine, alignmentLine, ...dataLines];

	return markdownLines.join("\n");
}

/**
 * OCRテキストにテーブルが含まれているかを簡易判定
 */
export function hasTableStructure(text: string): boolean {
	const lines = text.split("\n");

	// テーブルらしい行が2行以上あるかチェック
	let tableLineCount = 0;
	const separators = DEFAULT_OPTIONS.separators;

	for (const line of lines) {
		const hasSeparator = separators.some((sep) => line.includes(sep));
		const hasMultipleCells = line.split(/[|｜]/).length >= 3; // 最低2セル

		if (hasSeparator && hasMultipleCells) {
			tableLineCount++;
		}
	}

	return tableLineCount >= 2;
}

/**
 * OCRテキストを自動的にMarkdownテーブルに変換（メイン関数）
 */
export function autoConvertOcrToTable(
	ocrText: string,
	options: OcrTableProcessingOptions = {},
): string {
	// テーブル構造があるかチェック
	if (!hasTableStructure(ocrText)) {
		return ocrText; // そのまま返す
	}

	// テーブル変換を試行
	const result = processOcrTable(ocrText, { ...options, debug: false });

	if (result.success && result.markdownTable) {
		return result.markdownTable;
	}

	// 変換に失敗した場合は元のテキストを返す
	return ocrText;
}
