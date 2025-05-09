import { createClient } from "@/lib/supabase/server";
import { getAccountById } from "@/app/_actions/accounts";
import { redirect } from "next/navigation";
import { DashboardSummary } from "./_components/dashboard-summary";
import GoalSummary from "./_components/goal-summary";
import { QuickActionTiles } from "./_components/quick-action-tiles";
import { getLearningLogsByUser } from "@/app/_actions/learning_logs";
import { getStudyGoalsByUser } from "@/app/_actions/study_goals";
import { getDashboardStats } from "@/app/_actions/dashboardStats";
import UserIdSetter from "@/components/user-id-setter";
import { Container } from "@/components/container";

export default async function DashboardPage() {
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

	// シリアライズしてプロトタイプを剥がす
	const safeStudyGoals = JSON.parse(JSON.stringify(studyGoals || []));
	const safeLogs = JSON.parse(JSON.stringify(logs || []));

	return (
		<Container>
			{/* Set the current user ID for downstream components */}
			<UserIdSetter userId={user.id} />
			<div className="space-y-4">
				<GoalSummary goals={safeStudyGoals} logs={safeLogs} />
				<QuickActionTiles />
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<DashboardSummary stats={stats} />
				</div>
			</div>
		</Container>
	);
}
