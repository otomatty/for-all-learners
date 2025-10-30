/**
 * Markdownテーブル記法に対応したカスタムTable拡張
 *
 * TiptapのTable拡張をベースに、Markdownテーブル記法の
 * 自動検出・変換機能を追加したカスタム拡張機能
 */

import type { ChainedCommands } from "@tiptap/core";
import {
	mergeAttributes,
	nodeInputRule,
	textblockTypeInputRule,
} from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { parseMarkdownTable } from "@/lib/utils/markdownTableParser";

// テーブル関連の拡張機能をすべてエクスポート
export { TableRow, TableHeader, TableCell };

/**
 * カスタムTableRow拡張
 * shadcn/uiのスタイルに合わせたスタイリング
 */
export const CustomTableRow = TableRow.extend({
	renderHTML({ HTMLAttributes }) {
		return [
			"tr",
			mergeAttributes(HTMLAttributes, {
				class:
					"border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
			}),
			0,
		];
	},
});

/**
 * カスタムTableHeader拡張
 * shadcn/uiのスタイルに合わせたスタイリングとアライメント対応
 */
export const CustomTableHeader = TableHeader.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			textAlign: {
				default: "left",
				parseHTML: (element) => element.style.textAlign || "left",
				renderHTML: (attributes) => {
					if (!attributes.textAlign) return {};
					return { style: `text-align: ${attributes.textAlign}` };
				},
			},
		};
	},

	renderHTML({ HTMLAttributes, node }) {
		const align = (node.attrs.textAlign as string) || "left";
		const alignClass: Record<string, string> = {
			left: "text-left",
			center: "text-center",
			right: "text-right",
		};
		const finalAlignClass = alignClass[align] || "text-left";

		return [
			"th",
			mergeAttributes(HTMLAttributes, {
				class: `h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${finalAlignClass}`,
			}),
			0,
		];
	},
});

/**
 * カスタムTableCell拡張
 * shadcn/uiのスタイルに合わせたスタイリングとアライメント対応
 */
export const CustomTableCell = TableCell.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			textAlign: {
				default: "left",
				parseHTML: (element) => element.style.textAlign || "left",
				renderHTML: (attributes) => {
					if (!attributes.textAlign) return {};
					return { style: `text-align: ${attributes.textAlign}` };
				},
			},
		};
	},

	renderHTML({ HTMLAttributes, node }) {
		const align = (node.attrs.textAlign as string) || "left";
		const alignClass: Record<string, string> = {
			left: "text-left",
			center: "text-center",
			right: "text-right",
		};
		const finalAlignClass = alignClass[align] || "text-left";

		return [
			"td",
			mergeAttributes(HTMLAttributes, {
				class: `p-4 align-middle [&:has([role=checkbox])]:pr-0 ${finalAlignClass}`,
			}),
			0,
		];
	},
});

/**
 * メインのカスタムTable拡張
 * Markdownテーブル記法の入力ルールを追加
 */
export const CustomTable = Table.extend({
	addOptions() {
		return {
			...this.parent?.(),
			HTMLAttributes: {},
			resizable: true,
			handleWidth: 5,
			cellMinWidth: 25,
			allowTableNodeSelection: false,
		};
	},

	addInputRules() {
		const original = this.parent?.() ?? [];

		return [
			...original,
			// シンプルなテーブル作成ルール: |col1|col2| を入力した時
			nodeInputRule({
				find: /^\|\s*(.+?)\s*\|\s*$/,
				type: this.type,
				getAttributes: (match) => {
					const headerText = match[1];
					const headers = headerText.split("|").map((h) => h.trim());

					if (headers.length < 2) return false;

					// 簡単な2x2テーブルを作成
					return {
						createTable: {
							headers,
							rows: [headers.map(() => "")], // 空の行を1つ作成
						},
					};
				},
			}),

			// 完全なMarkdownテーブル記法の検出
			textblockTypeInputRule({
				find: /^\|\s*(.+\|.+)\s*\n\s*\|(:?-+:?\|:?-+:?.*)\s*\n((?:\s*\|.+\|.*\n?)*)/,
				type: this.type,
				getAttributes: (match) => {
					const fullMatch = match[0];
					const tableData = parseMarkdownTable(fullMatch);

					if (!tableData) return false;

					return {
						markdownTable: tableData,
					};
				},
			}),
		];
	},

	addCommands() {
		return {
			...this.parent?.(),

			// Markdownからテーブルを挿入するコマンド
			insertMarkdownTable:
				(markdownText: string) =>
				({ commands }: { commands: ChainedCommands }) => {
					const tableData = parseMarkdownTable(markdownText);
					if (!tableData) return false;

					const { headers, rows } = tableData;

					// テーブルを作成
					return commands.insertTable({
						rows: rows.length + 1, // ヘッダー行を含む
						cols: headers.length,
						withHeaderRow: true,
					});
				},

			// テーブル作成のショートカットコマンド
			insertQuickTable:
				(rows = 3, cols = 3) =>
				({ commands }: { commands: ChainedCommands }) => {
					return commands.insertTable({
						rows,
						cols,
						withHeaderRow: true,
					});
				},
		};
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
		return [
			"div",
			{ class: "relative w-full overflow-auto my-4" },
			[
				"table",
				mergeAttributes(HTMLAttributes, {
					class: "w-full caption-bottom text-sm border-collapse",
				}),
				["tbody", 0],
			],
		];
	},

	addKeyboardShortcuts() {
		return {
			...this.parent?.(),
			// Mod-Shift-T でクイックテーブル挿入
			"Mod-Shift-t": () =>
				this.editor.commands.insertTable({
					rows: 3,
					cols: 3,
					withHeaderRow: true,
				}),
		};
	},
});

/**
 * すべてのテーブル関連拡張をまとめたセット
 * usePageEditorLogic.tsで使用する際の利便性のため
 */
export const TableExtensions = [
	CustomTable.configure({
		resizable: true,
		HTMLAttributes: {
			class: "table-auto",
		},
	}),
	CustomTableRow,
	CustomTableHeader,
	CustomTableCell,
];

/**
 * 設定可能なオプション付きでテーブル拡張を作成
 */
export function createTableExtensions(options?: {
	resizable?: boolean;
	cellMinWidth?: number;
	handleWidth?: number;
}) {
	return [
		CustomTable.configure({
			resizable: options?.resizable ?? true,
			cellMinWidth: options?.cellMinWidth ?? 25,
			handleWidth: options?.handleWidth ?? 5,
			HTMLAttributes: {
				class: "table-auto",
			},
		}),
		CustomTableRow,
		CustomTableHeader,
		CustomTableCell,
	];
}
