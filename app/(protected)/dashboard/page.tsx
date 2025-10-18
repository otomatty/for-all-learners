// actions

import { redirect } from "next/navigation";
import { getAccountById } from "@/app/_actions/accounts";
import { getAllDueCountsByUser } from "@/app/_actions/cards";
import { getDashboardStats } from "@/app/_actions/dashboardStats";
import { getLearningLogsByUser } from "@/app/_actions/learning_logs";
import { getStudyGoalsByUser } from "@/app/_actions/study_goals";
// conponents
import { Container } from "@/components/container";
import { UserIdSetter } from "@/components/user-id-setter";
import { createClient } from "@/lib/supabase/server";
import { GoalSummary } from "./_components/goal-summary";
import { QuickActionTiles } from "./_components/quick-action-tiles";

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

	// Fetch account info, dashboard stats, and study data
	await getAccountById(user.id);
	const [stats, studyGoals, logs] = await Promise.all([
		getDashboardStats(user.id),
		getStudyGoalsByUser(user.id),
		getLearningLogsByUser(user.id),
	]);

	const searchParams = searchParamsPromise
		? await searchParamsPromise
		: undefined;
	const currentGoalIdFromUrl = searchParams?.goalId as string | undefined;

	// シリアライズしてプロトタイプを剥がす
	const safeStudyGoals = JSON.parse(JSON.stringify(studyGoals || []));
	const safeLogs = JSON.parse(JSON.stringify(logs || []));

	// ユーザーの全デッキを取得
	const { data: deckRows, error: deckError } = await supabase
		.from("decks")
		.select("*")
		.eq("user_id", user.id);
	if (deckError || !deckRows) {
		console.error("Failed to fetch decks:", deckError);
		return (
			<Container>
				<p>デッキの取得に失敗しました。</p>
			</Container>
		);
	}
	// 期限切れカード数マップを1回で取得
	const dueMap = await getAllDueCountsByUser(user.id);
	// デッキに復習数をマージ
	const decksWithDueCount = deckRows.map((d) => ({
		...d,
		todayReviewCount: dueMap[d.id] ?? 0,
	}));

	return (
		<Container>
			{/* Set the current user ID for downstream components */}
			<UserIdSetter userId={user.id} />
			<div className="space-y-4">
				<GoalSummary
					goals={safeStudyGoals}
					logs={safeLogs}
					currentGoalIdFromUrl={currentGoalIdFromUrl}
					dueMap={dueMap}
				/>
				<QuickActionTiles decks={decksWithDueCount} />
			</div>
		</Container>
	);
}
