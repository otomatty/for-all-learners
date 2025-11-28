import { redirect } from "next/navigation";
import { AddGoalDialog } from "@/components/goals/AddGoalDialog";
import { Container } from "@/components/layouts/container";
import {
	getGoalLimitsServer,
	getStudyGoalsServer,
} from "@/lib/services/studyGoalsService";
import { createClient } from "@/lib/supabase/server";
import { GoalsList } from "./_components/GoalsList";
import { GoalsPageClient } from "./_components/GoalsPageClient";

export default async function GoalsPage() {
	// 静的エクスポート時はクライアントコンポーネントを使用
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return <GoalsPageClient />;
	}

	const supabase = await createClient();

	// 認証チェック
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect("/auth/login");
	}

	// 目標データを取得（既存フックのロジックを再利用）
	const [studyGoals, goalLimits] = await Promise.all([
		getStudyGoalsServer(user.id),
		getGoalLimitsServer(user.id),
	]);

	// 各目標に紐付いたデッキ情報を取得
	const goalsWithDeckCount = await Promise.all(
		studyGoals.map(async (goal) => {
			const { count } = await supabase
				.from("goal_deck_links")
				.select("*", { count: "exact", head: true })
				.eq("goal_id", goal.id);

			return {
				...goal,
				deckCount: count ?? 0,
			};
		}),
	);

	// シリアライズしてプロトタイプを剥がす
	const safeGoals = JSON.parse(JSON.stringify(goalsWithDeckCount));
	const safeLimits = JSON.parse(JSON.stringify(goalLimits));

	return (
		<Container>
			<div className="space-y-6">
				{/* ヘッダー */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">学習目標管理</h1>
						<p className="text-muted-foreground mt-1">
							目標: {safeLimits.currentCount} / {safeLimits.maxGoals}
							{!safeLimits.isPaid && (
								<span className="text-xs ml-2">(有料プランで10個まで)</span>
							)}
						</p>
					</div>
					<AddGoalDialog
						triggerButtonProps={{
							variant: "default",
							size: "sm",
						}}
					/>
				</div>

				{/* 目標一覧 */}
				<GoalsList goals={safeGoals} />
			</div>
		</Container>
	);
}
