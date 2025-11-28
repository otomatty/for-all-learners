"use client";

import { useSearchParams } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { UserIdSetter } from "@/components/user-id-setter";
import { useAllDueCountsByUser } from "@/hooks/cards/useAllDueCountsByUser";
import { useDecks } from "@/hooks/decks/useDecks";
import { useLearningLogs } from "@/hooks/learning_logs/useLearningLogs";
import { useStudyGoals } from "@/hooks/study_goals/useStudyGoals";
import { useAuth } from "@/lib/hooks/use-auth";
import { ActivityCalendar } from "./ActivityCalendar";
import type { MonthData } from "./ActivityCalendar/types";
import { GoalSummaryClientWrapper } from "./GoalSummary/GoalSummaryClientWrapper";
import { PluginAutoLoader } from "./PluginAutoLoader";
import { PluginWidgetsSection } from "./PluginWidgetsSection";
import { QuickActionTiles } from "./QuickActionTiles";

/**
 * Dashboard Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/dashboard/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ hooks/cards/useAllDueCountsByUser.ts
 *   ├─ hooks/decks/useDecks.ts
 *   ├─ hooks/learning_logs/useLearningLogs.ts
 *   ├─ hooks/study_goals/useStudyGoals.ts
 *   ├─ lib/hooks/use-auth.ts
 *   └─ components/layouts/container.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function DashboardPageClient() {
	const { user, loading: authLoading } = useAuth();
	const searchParams = useSearchParams();
	const currentGoalIdFromUrl = searchParams?.get("goalId") as
		| string
		| undefined;

	const { data: studyGoals = [], isLoading: goalsLoading } = useStudyGoals();
	const { data: logs = [], isLoading: logsLoading } = useLearningLogs();
	const { data: decks = [], isLoading: decksLoading } = useDecks();
	const { data: dueMap = {}, isLoading: dueMapLoading } = useAllDueCountsByUser(
		user?.id ?? "",
	);

	// 現在の年月を取得
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth() + 1;

	// 初期の月データ（空のデータ）
	const initialMonthData: MonthData = {
		year: currentYear,
		month: currentMonth,
		days: [],
		totalActiveDays: 0,
		streakCount: 0,
	};

	// ローディング状態
	const isLoading =
		authLoading || goalsLoading || logsLoading || decksLoading || dueMapLoading;

	if (authLoading) {
		return (
			<Container>
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-muted-foreground">読み込み中...</div>
				</div>
			</Container>
		);
	}

	if (!user) {
		return null; // ClientProtectedLayoutでリダイレクトされる
	}

	// シリアライズしてプロトタイプを剥がす
	const safeStudyGoals = JSON.parse(JSON.stringify(studyGoals));
	const safeLogs = JSON.parse(JSON.stringify(logs));

	// デッキに復習数をマージ
	const decksWithDueCount = decks.map((d) => ({
		...d,
		todayReviewCount: dueMap[d.id] ?? 0,
	}));

	return (
		<Container>
			{/* Set the current user ID for downstream components */}
			<UserIdSetter userId={user.id} />
			{/* Auto-load installed plugins on app startup */}
			<PluginAutoLoader />
			<div className="space-y-6">
				{/* 目標サマリー */}
				{!isLoading && (
					<GoalSummaryClientWrapper
						goals={safeStudyGoals}
						logs={safeLogs}
						currentGoalIdFromUrl={currentGoalIdFromUrl}
						dueMap={dueMap}
					/>
				)}

				{/* カレンダーUI */}
				<ActivityCalendar
					initialMonthData={initialMonthData}
					userId={user.id}
				/>

				{/* クイックアクション */}
				{!isLoading && <QuickActionTiles decks={decksWithDueCount} />}

				{/* プラグインWidget */}
				<PluginWidgetsSection />
			</div>
		</Container>
	);
}
