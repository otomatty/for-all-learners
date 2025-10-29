/**
 * Activity Calendar Utilities
 *
 * カレンダーUIで使用するユーティリティ関数
 */

import {
	addDays,
	endOfMonth,
	endOfWeek,
	format,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import type { DailyActivitySummary } from "./types";

/**
 * カレンダーグリッド用のデータ構造を生成
 * 前月・翌月の日付も含む完全なグリッドを作成
 *
 * @param year 年
 * @param month 月 (1-12)
 * @param days 日別活動サマリー
 * @returns カレンダーグリッド用の日付配列（null は空セル）
 */
export function generateCalendarGrid(
	year: number,
	month: number,
	days: DailyActivitySummary[],
): (DailyActivitySummary | null)[] {
	const monthStart = startOfMonth(new Date(year, month - 1));
	const monthEnd = endOfMonth(new Date(year, month - 1));

	// 週の開始日（日曜日）を基準にカレンダーグリッドの開始・終了を決定
	const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
	const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

	// O(n) optimization: Create a Map for O(1) lookup instead of O(n) find
	const daysMap = new Map(days.map((d) => [d.date, d]));

	const grid: (DailyActivitySummary | null)[] = [];
	let currentDate = gridStart;

	// グリッドの全セルを生成
	while (currentDate <= gridEnd) {
		const dateStr = format(currentDate, "yyyy-MM-dd");

		// 当月の日付のみデータを持ち、前月・翌月は null
		if (currentDate >= monthStart && currentDate <= monthEnd) {
			// O(1) lookup with Map
			grid.push(daysMap.get(dateStr) || null);
		} else {
			grid.push(null);
		}

		currentDate = addDays(currentDate, 1);
	}

	return grid;
}

/**
 * 日付文字列をフォーマット
 *
 * @param dateStr YYYY-MM-DD 形式の日付文字列
 * @param formatStr フォーマット文字列
 * @returns フォーマットされた日付文字列
 */
export function formatDate(dateStr: string, formatStr: string): string {
	return format(new Date(dateStr), formatStr);
}

/**
 * 月の表示名を取得
 *
 * @param year 年
 * @param month 月 (1-12)
 * @returns 月の表示名（例: "2025年10月"）
 */
export function getMonthDisplayName(year: number, month: number): string {
	return `${year}年${month}月`;
}
