"use client";

import { useQuery } from "@tanstack/react-query";
import { AddGoalDialog } from "@/components/goals/AddGoalDialog";
import { Container } from "@/components/layouts/container";
import { useGoalLimits } from "@/hooks/study_goals/useGoalLimits";
import { useStudyGoals } from "@/hooks/study_goals/useStudyGoals";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { GoalsList } from "./GoalsList";

/**
 * Goals Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/goals/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ hooks/study_goals/useStudyGoals.ts
 *   ├─ hooks/study_goals/useGoalLimits.ts
 *   ├─ lib/hooks/use-auth.ts
 *   └─ lib/supabase/client.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function GoalsPageClient() {
	const { user, loading: authLoading } = useAuth();
	const { data: studyGoals = [], isLoading: goalsLoading } = useStudyGoals();
	const { data: goalLimits, isLoading: limitsLoading } = useGoalLimits();

	// 各目標に紐付いたデッキ情報を取得
	const { data: goalsWithDeckCount = [], isLoading: deckCountLoading } =
		useQuery({
			queryKey: ["goals", "deck-counts", studyGoals.map((g) => g.id).join(",")],
			queryFn: async () => {
				if (!user || studyGoals.length === 0) return [];

				const supabase = createClient();
				const deckCounts = await Promise.all(
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

				return deckCounts;
			},
			enabled: !!user && studyGoals.length > 0,
		});

	const isLoading =
		authLoading || goalsLoading || limitsLoading || deckCountLoading;

	if (authLoading) {
		return (
			<Container>
				<div className="flex items-center justify-center h-40">
					<p className="text-muted-foreground">読み込み中...</p>
				</div>
			</Container>
		);
	}

	if (!user) {
		return null; // ClientProtectedLayoutでリダイレクトされる
	}

	if (isLoading || !goalLimits) {
		return (
			<Container>
				<div className="flex items-center justify-center h-40">
					<p className="text-muted-foreground">読み込み中...</p>
				</div>
			</Container>
		);
	}

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
