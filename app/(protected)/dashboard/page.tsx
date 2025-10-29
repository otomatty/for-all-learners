// actions

import { redirect } from "next/navigation";
import { getAccountById } from "@/app/_actions/accounts";
import { getMonthlyActivitySummary } from "@/app/_actions/activity_calendar";
import { getAllDueCountsByUser } from "@/app/_actions/cards";
import { getLearningLogsByUser } from "@/app/_actions/learning_logs";
import { getStudyGoalsByUser } from "@/app/_actions/study_goals";
// conponents
import { Container } from "@/components/layouts/container";
import { UserIdSetter } from "@/components/user-id-setter";
import { createClient } from "@/lib/supabase/server";
import { ActivityCalendar } from "./_components/ActivityCalendar";
import { GoalSummary } from "./_components/GoalSummary";
import { QuickActionTiles } from "./_components/QuickActionTiles";

export default async function DashboardPage({
	searchParams: searchParamsPromise, // Renaming to clarify it's a promise
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const supabase = await createClient();
	// Securely fetch authenticated user
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		redirect("/auth/login");
	}

	// Parallel data fetching for optimal performance
	const searchParams = searchParamsPromise
		? await searchParamsPromise
		: undefined;
	const currentGoalIdFromUrl = searchParams?.goalId as string | undefined;

	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth() + 1;

	// Fetch account info first (may have side effects)
	await getAccountById(user.id);

	// Fetch all required data in parallel to minimize latency
	const [studyGoals, logs, decksResult, dueMap, monthData] = await Promise.all([
		getStudyGoalsByUser(user.id),
		getLearningLogsByUser(user.id),
		supabase.from("decks").select("*").eq("user_id", user.id),
		getAllDueCountsByUser(user.id),
		getMonthlyActivitySummary(user.id, currentYear, currentMonth),
	]);

	// Check decks result
	if (decksResult.error || !decksResult.data) {
		return (
			<Container>
				<p>デッキの取得に失敗しました。</p>
			</Container>
		);
	}

	// シリアライズしてプロトタイプを剥がす
	const safeStudyGoals = JSON.parse(JSON.stringify(studyGoals || []));
	const safeLogs = JSON.parse(JSON.stringify(logs || []));

	// デッキに復習数をマージ
	const decksWithDueCount = decksResult.data.map((d) => ({
		...d,
		todayReviewCount: dueMap[d.id] ?? 0,
	}));

	return (
		<Container>
			{/* Set the current user ID for downstream components */}
			<UserIdSetter userId={user.id} />
			<div className="space-y-6">
				{/* 目標サマリー */}
				<GoalSummary
					goals={safeStudyGoals}
					logs={safeLogs}
					currentGoalIdFromUrl={currentGoalIdFromUrl}
					dueMap={dueMap}
				/>

				{/* カレンダーUI */}
				<ActivityCalendar initialMonthData={monthData} userId={user.id} />

				{/* クイックアクション */}
				<QuickActionTiles decks={decksWithDueCount} />
			</div>
		</Container>
	);
}
