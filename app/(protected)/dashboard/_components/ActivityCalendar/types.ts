/**
 * Activity Calendar Types
 *
 * カレンダーUIで使用する型定義
 */

/**
 * 活動レベル
 */
export type ActivityLevel = "none" | "partial" | "good" | "excellent";

/**
 * 学習統計（日別）
 */
export interface LearningStats {
	totalCards: number; // 総カード数
	reviewedCards: number; // 復習カード数
	newCards: number; // 新規カード数
	correctRate: number; // 正答率 (0-100)
	totalMinutes: number; // 総学習時間（分）
}

/**
 * ノート統計（日別）
 */
export interface NoteStats {
	pagesCreated: number; // 新規作成ページ数
	pagesUpdated: number; // 更新ページ数
	linksCreated: number; // 作成リンク数
	totalEditMinutes: number; // 総編集時間（推定、分）
}

/**
 * 日別活動サマリー（カレンダー表示用）
 */
export interface DailyActivitySummary {
	date: string; // YYYY-MM-DD
	isToday: boolean; // 今日かどうか
	activityLevel: ActivityLevel; // 活動レベル
	learning: LearningStats; // 学習統計
	notes: NoteStats; // ノート統計
}

/**
 * 学習活動詳細（詳細パネル用）
 */
export interface LearningActivityDetail {
	deckName: string;
	deckId: string;
	reviewedCards: number;
	newCards: number;
	correctRate: number;
	timeSpentMinutes: number;
}

/**
 * ノート作成詳細
 */
export interface PageCreatedDetail {
	title: string;
	id: string;
	createdAt: string;
}

/**
 * ノート更新詳細
 */
export interface PageUpdatedDetail {
	title: string;
	id: string;
	updatedAt: string;
}

/**
 * ノート活動詳細（詳細パネル用）
 */
export interface NoteActivityDetail {
	created: PageCreatedDetail[];
	updated: PageUpdatedDetail[];
	linksCreated: number;
}

/**
 * 目標達成状況
 */
export interface GoalAchievement {
	goalTitle: string;
	targetValue: number;
	actualValue: number;
	achieved: boolean;
	unit: string; // '枚', '分', '%' など
}

/**
 * 日別活動詳細（詳細パネル表示用）
 */
export interface DayActivityDetail {
	date: string;
	summary: DailyActivitySummary;
	learningActivities: LearningActivityDetail[];
	noteActivities: NoteActivityDetail;
	goalAchievements: GoalAchievement[];
}

/**
 * カレンダー表示用の月データ
 */
export interface MonthData {
	year: number;
	month: number; // 1-12
	days: DailyActivitySummary[];
	totalActiveDays: number;
	streakCount: number; // 連続学習日数
}
