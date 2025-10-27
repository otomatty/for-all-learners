"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { QuizSettingsDialog } from "@/components/quiz-settings-dialog";
import { createClient } from "@/lib/supabase/client";
import GoalHeatmap from "./GoalHeatmap";
import GoalSelect from "./GoalSelect";
import TimeProgress from "./TimeProgress";

interface StudyGoal {
	id: string;
	title: string;
	created_at?: string | null;
	deadline?: string | null;
	progress_rate: number;
}
interface LearningLog {
	answered_at: string | null;
}
interface GoalSummaryClientProps {
	goals: StudyGoal[];
	logs: LearningLog[];
	initialSelectedGoalId?: string;
}

const GoalSummaryClient: React.FC<GoalSummaryClientProps> = ({
	goals,
	logs,
	initialSelectedGoalId,
}) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [selectedGoalId, setSelectedGoalId] = useState<string>(
		initialSelectedGoalId || (goals.length > 0 ? goals[0].id : ""),
	);

	useEffect(() => {
		const goalIdFromUrl = searchParams.get("goalId");
		if (goalIdFromUrl) {
			if (goals.find((g) => g.id === goalIdFromUrl)) {
				if (selectedGoalId !== goalIdFromUrl) {
					setSelectedGoalId(goalIdFromUrl);
				}
			} else if (goals.length > 0) {
				// URLのgoalIdが無効な場合、有効な最初のgoalにフォールバック
				const firstValidGoalId = goals[0].id;
				setSelectedGoalId(firstValidGoalId);
				router.replace(`/dashboard?goalId=${firstValidGoalId}`, {
					scroll: false,
				});
			}
		} else if (
			initialSelectedGoalId &&
			selectedGoalId !== initialSelectedGoalId
		) {
			// URLにパラメータがなく、初期IDと現在の選択が異なる場合 (例: 初期ロード後)
			setSelectedGoalId(initialSelectedGoalId);
		}
	}, [searchParams, goals, router, selectedGoalId, initialSelectedGoalId]);

	const selectedGoal = goals.find((g) => g.id === selectedGoalId);
	const now = new Date();

	// Extract and narrow time properties
	const createdAt = selectedGoal?.created_at;
	const deadlineVal = selectedGoal?.deadline;

	const dateCounts = logs.reduce<Record<string, number>>((acc, log) => {
		const dateKey = log.answered_at
			? new Date(log.answered_at).toISOString().split("T")[0]
			: null;
		if (dateKey) {
			acc[dateKey] = (acc[dateKey] || 0) + 1;
		}
		return acc;
	}, {});
	const heatmapValues = Object.entries(dateCounts).map(([date, count]) => ({
		date,
		count,
	}));
	const startDate = new Date(now);
	startDate.setFullYear(startDate.getFullYear() - 1);

	// Reviewモード用: 目標に紐づく復習対象カード数を取得
	const [reviewCount, setReviewCount] = useState<number>(0);
	useEffect(() => {
		const fetchReviewCount = async () => {
			if (!selectedGoalId) return;
			const supabase = createClient();
			// ゴールに紐づくデッキID取得
			const { data: links, error: linksError } = await supabase
				.from("goal_deck_links")
				.select("deck_id")
				.eq("goal_id", selectedGoalId);
			if (linksError) {
				console.error("Failed to fetch goal-deck links:", linksError);
				return;
			}
			const deckIds = links.map((l) => l.deck_id);
			if (deckIds.length === 0) {
				setReviewCount(0);
				return;
			}
			// 復習対象カード数カウント (next_review_at が null or 過去)
			const nowIso = new Date().toISOString();
			const { count, error: countError } = await supabase
				.from("cards")
				.select("id", { count: "exact", head: true })
				.in("deck_id", deckIds)
				.or(`next_review_at.is.null,next_review_at.lte.${nowIso}`);
			if (countError) {
				console.error("Failed to count due cards:", countError);
				return;
			}
			setReviewCount(count ?? 0);
		};
		fetchReviewCount();
	}, [selectedGoalId]);

	const handleGoalChange = (newGoalId: string) => {
		if (newGoalId !== selectedGoalId) {
			setSelectedGoalId(newGoalId); // UIの即時反映のため
			router.push(`/dashboard?goalId=${newGoalId}`, { scroll: false });
		}
	};

	if (!selectedGoal && goals.length > 0) {
		// selectedGoalId が不正な場合などのフォールバック（useEffectで処理されるはずだが念のため）
		return (
			<div className="mt-4 p-4 text-center">目標情報を読み込んでいます...</div>
		);
	}
	if (goals.length === 0) return null; // 親コンポーネントで処理されるが、念のため

	return (
		<div className="mt-4">
			<GoalSelect
				goals={goals}
				selectedGoalId={selectedGoalId}
				onGoalChange={handleGoalChange}
			/>
			{createdAt && deadlineVal && (
				<TimeProgress createdAt={createdAt} deadline={deadlineVal} />
			)}

			<div className="mt-4">
				<GoalHeatmap
					startDate={startDate}
					endDate={now}
					values={heatmapValues}
				/>
			</div>
			<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
				<QuizSettingsDialog
					goalId={selectedGoal?.id}
					goalTitle={selectedGoal?.title}
					triggerText="すべてのデッキを学習する"
				/>
				<QuizSettingsDialog
					goalId={selectedGoal?.id}
					goalTitle={selectedGoal?.title}
					triggerText="すべてのデッキを復習する"
					reviewMode={true}
					reviewCount={reviewCount}
					disabled={reviewCount === 0}
				/>
			</div>
		</div>
	);
};

export default GoalSummaryClient;
