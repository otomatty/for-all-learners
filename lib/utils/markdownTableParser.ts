/**
 * Markdownテーブル記法のパーサーとバリデーション
 *
 * Markdownテーブル記法（| 列1 | 列2 |）を解析し、
 * TiptapのJSONContent形式に変換する機能を提供
 */

export interface TableData {
	headers: string[];
	alignments: ("left" | "center" | "right")[];
	rows: string[][];
}

export interface MarkdownTableMatch {
	fullMatch: string;
	startIndex: number;
	endIndex: number;
	tableData: TableData;
}

/**
 * Markdownテーブル記法を検出する正規表現
 *
 * パターン:
 * | 列1 | 列2 | 列3 |
 * |-----|-----|-----|
 * | A   | B   | C   |
 * | D   | E   | F   |
 */
const MARKDOWN_TABLE_PATTERN =
	/^\s*\|(.+\|.+)\s*\n\s*\|(:?-+:?\|:?-+:?.*)\s*\n((?:\s*\|.+\|.*\n?)*)/gm;

/**
 * テーブルセルの配置を判定する
 */
function parseAlignment(alignStr: string): "left" | "center" | "right" {
	const trimmed = alignStr.trim();
	if (trimmed.startsWith(":") && trimmed.endsWith(":")) {
		return "center";
	}
	if (trimmed.endsWith(":")) {
		return "right";
	}
	return "left";
}

/**
 * テーブル行をセルに分割し、前後の空白を削除
 */
function parseTableRow(rowStr: string): string[] {
	// 先頭と末尾の | を除去してから分割
	const cleaned = rowStr.trim().replace(/^\||\|$/g, "");
	return cleaned.split("|").map((cell) => cell.trim());
}

/**
 * Markdownテーブル記法をパースしてTableData形式に変換
 */
export function parseMarkdownTable(markdown: string): TableData | null {
	try {
		const match = MARKDOWN_TABLE_PATTERN.exec(markdown);
		if (!match) {
			return null;
		}

		const [, headerStr, alignmentStr, rowsStr] = match;

		// ヘッダー行の解析
		const headers = parseTableRow(headerStr);
		if (headers.length === 0) {
			return null;
		}

		// アライメント行の解析
		const alignmentCells = parseTableRow(alignmentStr);
		const alignments = alignmentCells.map(parseAlignment);

		// データ行の解析
		const rowLines = rowsStr
			.trim()
			.split("\n")
			.filter((line) => line.trim());
		const rows = rowLines.map((line) => {
			const cells = parseTableRow(line);
			// ヘッダーの列数に合わせて調整
			while (cells.length < headers.length) {
				cells.push("");
			}
			return cells.slice(0, headers.length);
		});

		// 最低1行のデータが必要
		if (rows.length === 0) {
			return null;
		}

		return {
			headers,
			alignments,
			rows,
		};
	} catch (error) {
		console.warn("Markdownテーブルのパースに失敗:", error);
		return null;
	}
}

/**
 * 文字列内のMarkdownテーブルを検出して位置情報と共に返す
 */
export function findMarkdownTables(text: string): MarkdownTableMatch[] {
	const matches: MarkdownTableMatch[] = [];
	const regex = new RegExp(
		MARKDOWN_TABLE_PATTERN.source,
		MARKDOWN_TABLE_PATTERN.flags,
	);

	let match: RegExpExecArray | null = regex.exec(text);

	while (match !== null) {
		const fullMatch = match[0];
		const startIndex = match.index;
		const endIndex = startIndex + fullMatch.length;

		const tableData = parseMarkdownTable(fullMatch);
		if (tableData) {
			matches.push({
				fullMatch,
				startIndex,
				endIndex,
				tableData,
			});
		}

		match = regex.exec(text);
	}

	return matches;
}

/**
 * Markdownテーブルの構文チェック
 */
export function validateMarkdownTable(markdown: string): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	const tableData = parseMarkdownTable(markdown);
	if (!tableData) {
		return {
			isValid: false,
			errors: ["無効なMarkdownテーブル記法です"],
		};
	}

	// ヘッダーの妥当性チェック
	if (tableData.headers.length === 0) {
		errors.push("ヘッダー行が空です");
	}

	if (tableData.headers.some((header) => header.length === 0)) {
		errors.push("空のヘッダーが含まれています");
	}

	// 行の妥当性チェック
	for (let i = 0; i < tableData.rows.length; i++) {
		const row = tableData.rows[i];
		if (row.length !== tableData.headers.length) {
			errors.push(`行${i + 1}の列数がヘッダーと一致しません`);
		}
	}

	// アライメントの数チェック
	if (tableData.alignments.length !== tableData.headers.length) {
		errors.push("アライメント定義の数がヘッダーと一致しません");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * TableDataからMarkdown文字列を生成（デバッグ用）
 */
export function tableDataToMarkdown(tableData: TableData): string {
	const { headers, alignments, rows } = tableData;

	// ヘッダー行
	const headerRow = `| ${headers.join(" | ")} |`;

	// アライメント行
	const alignmentRow = `| ${alignments
		.map((align) => {
			switch (align) {
				case "center":
					return ":---:";
				case "right":
					return "---:";
				default:
					return "---";
			}
		})
		.join(" | ")} |`;

	// データ行
	const dataRows = rows.map((row) => `| ${row.join(" | ")} |`);

	return [headerRow, alignmentRow, ...dataRows].join("\n");
}
