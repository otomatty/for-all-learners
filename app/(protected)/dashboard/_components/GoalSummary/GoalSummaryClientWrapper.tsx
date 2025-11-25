"use client";

import { AddGoalDialog } from "@/components/goals/AddGoalDialog";
import { Card } from "@/components/ui/card";
import { useGoalDecks } from "@/hooks/goal_decks/useGoalDecks";
import ClientGoalDecksSection, {
	type DeckWithReviewCount,
} from "./GoalDeckSection/GoalDecksSectionClient";
import GoalSummaryClient from "./GoalSummaryClient";

interface StudyGoal {
	id: string;
	title: string;
	deadline?: string | null;
	progress_rate: number;
}
interface LearningLog {
	answered_at: string | null;
}
interface GoalSummaryClientWrapperProps {
	goals: StudyGoal[];
	logs: LearningLog[];
	currentGoalIdFromUrl?: string;
	/** デッキIDをキーとした期限切れカード数マップ */
	dueMap: Record<string, number>;
}

/**
 * Client-side wrapper for GoalSummary
 * Used in static export mode where server components cannot be used
 */
export function GoalSummaryClientWrapper({
	goals,
	logs,
	currentGoalIdFromUrl,
	dueMap,
}: GoalSummaryClientWrapperProps) {
	// 表示する目標IDを決定: URLパラメータがあればそれを使い、なければ最初の目標
	const goalIdToDisplay =
		goals.length > 0
			? currentGoalIdFromUrl && goals.find((g) => g.id === currentGoalIdFromUrl)
				? currentGoalIdFromUrl
				: goals[0].id
			: "";

	// 目標に紐づくデッキを取得（常に呼び出す必要があるため、早期リターンの前に配置）
	const { data: goalDecks = [], isLoading: decksLoading } =
		useGoalDecks(goalIdToDisplay);

	// 目標が未設定のときのエンプティステート表示
	if (goals.length === 0) {
		return (
			<Card className="p-4 text-center space-y-4">
				<p className="text-gray-500">
					まだ学習目標が設定されていません。目標を追加してください。
				</p>
				<AddGoalDialog />
			</Card>
		);
	}

	// デッキに復習数をマージ
	const decksWithReviewCount: DeckWithReviewCount[] = goalDecks.map((d) => ({
		...d,
		card_count: d.card_count ?? 0,
		description: d.description ?? "",
		is_public: d.is_public ?? false,
		todayReviewCount: dueMap[d.id] ?? 0,
	}));

	return (
		<Card className="p-4">
			<GoalSummaryClient
				goals={goals}
				logs={logs}
				initialSelectedGoalId={goalIdToDisplay}
			/>
			{!decksLoading && (
				<ClientGoalDecksSection
					key={goalIdToDisplay}
					goalId={goalIdToDisplay}
					initialDecks={decksWithReviewCount}
				/>
			)}
		</Card>
	);
}
