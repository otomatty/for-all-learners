// actions
import { getAccountById } from "@/app/_actions/accounts";
import { getDashboardStats } from "@/app/_actions/dashboardStats";
import { getLearningLogsByUser } from "@/app/_actions/learning_logs";
import { getStudyGoalsByUser } from "@/app/_actions/study_goals";
// conponents
import { Container } from "@/components/container";
import { UserIdSetter } from "@/components/user-id-setter";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

	return (
		<Container>
			{/* Set the current user ID for downstream components */}
			<UserIdSetter userId={user.id} />
			<div className="space-y-4">
				<GoalSummary
					goals={safeStudyGoals}
					logs={safeLogs}
					currentGoalIdFromUrl={currentGoalIdFromUrl}
				/>
				<QuickActionTiles />
			</div>
		</Container>
	);
}
