"use server";

import {
	endOfDay,
	endOfMonth,
	format,
	isToday,
	startOfDay,
	startOfMonth,
} from "date-fns";
import { ACTIVITY_THRESHOLDS } from "@/app/(protected)/dashboard/_components/ActivityCalendar/constants";
import type {
	ActivityLevel,
	DailyActivitySummary,
	DayActivityDetail,
	GoalAchievement,
	LearningActivityDetail,
	LearningStats,
	MonthData,
	NoteActivityDetail,
	NoteStats,
} from "@/app/(protected)/dashboard/_components/ActivityCalendar/types";
import { createClient } from "@/lib/supabase/server";

/**
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ app/(protected)/dashboard/_components/ActivityCalendar/index.tsx
 *
 * Dependencies (依存先):
 *   ├─ lib/supabase/server.ts
 *   ├─ date-fns
 *   └─ ActivityCalendar/types.ts
 *
 * Related Files:
 *   ├─ Spec: docs/03_plans/dashboard-calendar-ui/20251028_01_calendar-ui-specification.md
 *   └─ Types: app/(protected)/dashboard/_components/ActivityCalendar/types.ts
 */

/**
 * 活動レベルを判定
 *
 * @param learning 学習統計
 * @param notes ノート統計
 * @returns 活動レベル
 */
function determineActivityLevel(
	learning: LearningStats,
	notes: NoteStats,
): ActivityLevel {
	const totalCards = learning.totalCards;
	const totalMinutes = learning.totalMinutes;
	const hasNoteActivity =
		notes.pagesCreated > 0 || notes.pagesUpdated > 0 || notes.linksCreated > 0;

	// 活動なし
	if (totalCards === 0 && totalMinutes === 0 && !hasNoteActivity) {
		return "none";
	}

	// 優秀: カード30枚以上 または 学習時間60分以上
	if (
		totalCards >= ACTIVITY_THRESHOLDS.excellent.cards ||
		totalMinutes >= ACTIVITY_THRESHOLDS.excellent.minutes
	) {
		return "excellent";
	}

	// 良好: カード20枚以上 または 学習時間30分以上
	if (
		totalCards >= ACTIVITY_THRESHOLDS.good.cards ||
		totalMinutes >= ACTIVITY_THRESHOLDS.good.minutes
	) {
		return "good";
	}

	// わずか: カード10枚以上 または 学習時間15分以上 またはノート活動あり
	if (
		totalCards >= ACTIVITY_THRESHOLDS.partial.cards ||
		totalMinutes >= ACTIVITY_THRESHOLDS.partial.minutes ||
		hasNoteActivity
	) {
		return "partial";
	}

	return "none";
}

/**
 * 学習ログから日別の統計を計算
 *
 * @param userId ユーザーID
 * @param date 対象日付
 * @returns 学習統計
 */
async function calculateLearningStats(
	userId: string,
	date: Date,
): Promise<LearningStats> {
	const supabase = await createClient();

	const dayStart = startOfDay(date);
	const dayEnd = endOfDay(date);

	const { data: logs, error } = await supabase
		.from("learning_logs")
		.select("*")
		.eq("user_id", userId)
		.gte("answered_at", dayStart.toISOString())
		.lte("answered_at", dayEnd.toISOString());

	if (error) {
		// ログ取得失敗時は空の統計を返す
		return {
			totalCards: 0,
			reviewedCards: 0,
			newCards: 0,
			correctRate: 0,
			totalMinutes: 0,
		};
	}

	if (!logs || logs.length === 0) {
		return {
			totalCards: 0,
			reviewedCards: 0,
			newCards: 0,
			correctRate: 0,
			totalMinutes: 0,
		};
	}

	const totalCards = logs.length;
	const reviewedCards = logs.filter(
		(log) => log.practice_mode === "review",
	).length;
	const newCards = logs.filter((log) => log.practice_mode === "new").length;
	const correctCount = logs.filter((log) => log.is_correct).length;
	const correctRate = totalCards > 0 ? (correctCount / totalCards) * 100 : 0;
	const totalSeconds = logs.reduce(
		(sum, log) => sum + (log.effort_time || 0),
		0,
	);
	const totalMinutes = Math.round(totalSeconds / 60);

	return {
		totalCards,
		reviewedCards,
		newCards,
		correctRate: Math.round(correctRate * 10) / 10, // 小数第1位まで
		totalMinutes,
	};
}

/**
 * ページ作成・編集から日別の統計を計算
 *
 * @param userId ユーザーID
 * @param date 対象日付
 * @returns ノート統計
 */
async function calculateNoteStats(
	userId: string,
	date: Date,
): Promise<NoteStats> {
	const supabase = await createClient();

	const dayStart = startOfDay(date);
	const dayEnd = endOfDay(date);

	// 新規作成ページ数
	const { data: createdPages, error: createdError } = await supabase
		.from("pages")
		.select("id")
		.eq("user_id", userId)
		.gte("created_at", dayStart.toISOString())
		.lte("created_at", dayEnd.toISOString());

	// 更新ページ数（作成日と更新日が異なるもの）
	const { data: updatedPages, error: updatedError } = await supabase
		.from("pages")
		.select("id, created_at, updated_at")
		.eq("user_id", userId)
		.gte("updated_at", dayStart.toISOString())
		.lte("updated_at", dayEnd.toISOString())
		.neq("created_at", "updated_at");

	// リンク作成数
	const { data: links, error: linksError } = await supabase
		.from("card_page_links")
		.select("id, card_id")
		.gte("created_at", dayStart.toISOString())
		.lte("created_at", dayEnd.toISOString())
		.limit(1000); // パフォーマンス考慮

	if (createdError || updatedError || linksError) {
		// ノート統計取得失敗時は空の統計を返す
		return {
			pagesCreated: 0,
			pagesUpdated: 0,
			linksCreated: 0,
			totalEditMinutes: 0,
		};
	}

	const pagesCreated = createdPages?.length || 0;
	const pagesUpdated = updatedPages?.length || 0;
	const linksCreated = links?.length || 0;

	// 編集時間の推定（ページ作成: 15分、更新: 10分、リンク: 1分）
	const totalEditMinutes =
		pagesCreated * 15 + pagesUpdated * 10 + linksCreated * 1;

	return {
		pagesCreated,
		pagesUpdated,
		linksCreated,
		totalEditMinutes,
	};
}

/**
 * 指定月の日別活動サマリーを取得
 *
 * @param userId ユーザーID
 * @param year 年
 * @param month 月 (1-12)
 * @returns 月別データ
 */
export async function getMonthlyActivitySummary(
	userId: string,
	year: number,
	month: number,
): Promise<MonthData> {
	const monthStart = startOfMonth(new Date(year, month - 1));
	const monthEnd = endOfMonth(new Date(year, month - 1));

	const days: DailyActivitySummary[] = [];
	const currentDate = new Date(monthStart);

	// 月の全日付を処理
	while (currentDate <= monthEnd) {
		const dateStr = format(currentDate, "yyyy-MM-dd");
		const [learning, notes] = await Promise.all([
			calculateLearningStats(userId, currentDate),
			calculateNoteStats(userId, currentDate),
		]);

		const activityLevel = determineActivityLevel(learning, notes);

		days.push({
			date: dateStr,
			isToday: isToday(currentDate),
			activityLevel,
			learning,
			notes,
		});

		currentDate.setDate(currentDate.getDate() + 1);
	}

	// アクティブな日数をカウント
	const totalActiveDays = days.filter(
		(day) => day.activityLevel !== "none",
	).length;

	// 連続学習日数を計算（今日から過去に遡って）
	let streakCount = 0;
	const today = new Date();
	const checkDate = new Date(today);

	while (true) {
		const dateStr = format(checkDate, "yyyy-MM-dd");
		const dayData = days.find((d) => d.date === dateStr);

		if (!dayData || dayData.activityLevel === "none") {
			break;
		}

		streakCount++;
		checkDate.setDate(checkDate.getDate() - 1);

		// 月を跨ぐ場合は別途取得が必要だが、Phase 1では月内のみ
		if (checkDate < monthStart) {
			break;
		}
	}

	return {
		year,
		month,
		days,
		totalActiveDays,
		streakCount,
	};
}

/**
 * 特定日の詳細な活動データを取得
 *
 * @param userId ユーザーID
 * @param date 対象日付
 * @returns 日別活動詳細
 */
export async function getDayActivityDetail(
	userId: string,
	date: Date,
): Promise<DayActivityDetail> {
	const supabase = await createClient();
	const dateStr = format(date, "yyyy-MM-dd");
	const dayStart = startOfDay(date);
	const dayEnd = endOfDay(date);

	// 基本統計を取得
	const [learning, notes] = await Promise.all([
		calculateLearningStats(userId, date),
		calculateNoteStats(userId, date),
	]);

	const summary: DailyActivitySummary = {
		date: dateStr,
		isToday: isToday(date),
		activityLevel: determineActivityLevel(learning, notes),
		learning,
		notes,
	};

	// 学習活動詳細を取得（デッキ別）
	const { data: logs, error: logsError } = await supabase
		.from("learning_logs")
		.select(`
			*,
			card:cards(
				deck:decks(
					id,
					title
				)
			)
		`)
		.eq("user_id", userId)
		.gte("answered_at", dayStart.toISOString())
		.lte("answered_at", dayEnd.toISOString());

	const learningActivities: LearningActivityDetail[] = [];

	if (logs && !logsError) {
		// デッキ別に集計
		const deckMap = new Map<
			string,
			{
				deckName: string;
				deckId: string;
				logs: typeof logs;
			}
		>();

		for (const log of logs) {
			// 型アサーションでデッキ情報を取得
			const logWithCard = log as typeof log & {
				card: { deck: { id: string; title: string } } | null;
			};
			const deck = logWithCard.card?.deck;
			if (!deck) continue;

			if (!deckMap.has(deck.id)) {
				deckMap.set(deck.id, {
					deckName: deck.title,
					deckId: deck.id,
					logs: [],
				});
			}
			const deckData = deckMap.get(deck.id);
			if (deckData) {
				deckData.logs.push(log);
			}
		}

		// 各デッキの統計を計算
		for (const [_, deckData] of deckMap) {
			const reviewedCards = deckData.logs.filter(
				(log) => log.practice_mode === "review",
			).length;
			const newCards = deckData.logs.filter(
				(log) => log.practice_mode === "new",
			).length;
			const correctCount = deckData.logs.filter((log) => log.is_correct).length;
			const correctRate =
				deckData.logs.length > 0
					? (correctCount / deckData.logs.length) * 100
					: 0;
			const timeSpentSeconds = deckData.logs.reduce(
				(sum, log) => sum + (log.effort_time || 0),
				0,
			);
			const timeSpentMinutes = Math.round(timeSpentSeconds / 60);

			learningActivities.push({
				deckName: deckData.deckName,
				deckId: deckData.deckId,
				reviewedCards,
				newCards,
				correctRate: Math.round(correctRate * 10) / 10,
				timeSpentMinutes,
			});
		}
	}

	// ノート活動詳細を取得
	const { data: createdPages } = await supabase
		.from("pages")
		.select("id, title, created_at")
		.eq("user_id", userId)
		.gte("created_at", dayStart.toISOString())
		.lte("created_at", dayEnd.toISOString())
		.order("created_at", { ascending: false });

	const { data: updatedPages } = await supabase
		.from("pages")
		.select("id, title, updated_at, created_at")
		.eq("user_id", userId)
		.gte("updated_at", dayStart.toISOString())
		.lte("updated_at", dayEnd.toISOString())
		.neq("created_at", "updated_at")
		.order("updated_at", { ascending: false });

	const { data: linksData } = await supabase
		.from("card_page_links")
		.select("id")
		.gte("created_at", dayStart.toISOString())
		.lte("created_at", dayEnd.toISOString());

	const noteActivities: NoteActivityDetail = {
		created:
			createdPages
				?.filter((page) => page.created_at !== null)
				.map((page) => ({
					title: page.title,
					id: page.id,
					createdAt: page.created_at as string,
				})) || [],
		updated:
			updatedPages
				?.filter((page) => page.updated_at !== null)
				.map((page) => ({
					title: page.title,
					id: page.id,
					updatedAt: page.updated_at as string,
				})) || [],
		linksCreated: linksData?.length || 0,
	};

	// 目標達成状況（Phase 1では簡易版 - 基本統計のみ表示）
	const goalAchievements: GoalAchievement[] = [];

	// Phase 1: 目標達成機能は基本統計のみ表示
	// 学習時間目標（仮定: 60分以上）
	if (learning.totalMinutes > 0) {
		goalAchievements.push({
			goalTitle: "学習時間目標",
			targetValue: 60,
			actualValue: learning.totalMinutes,
			achieved: learning.totalMinutes >= 60,
			unit: "分",
		});
	}

	// カード枚数目標（仮定: 20枚以上）
	if (learning.totalCards > 0) {
		goalAchievements.push({
			goalTitle: "カード学習目標",
			targetValue: 20,
			actualValue: learning.totalCards,
			achieved: learning.totalCards >= 20,
			unit: "枚",
		});
	}

	// 正答率目標（仮定: 80%以上）
	if (learning.totalCards > 0) {
		goalAchievements.push({
			goalTitle: "正答率目標",
			targetValue: 80,
			actualValue: learning.correctRate,
			achieved: learning.correctRate >= 80,
			unit: "%",
		});
	}

	return {
		date: dateStr,
		summary,
		learningActivities,
		noteActivities,
		goalAchievements,
	};
}
