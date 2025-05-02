import React from "react";
import { getStudyGoalsByUser } from "@/app/_actions/study_goals";
import { getGoalDecks } from "@/app/_actions/goal-decks";

interface GoalsProps {
	userId: string;
}

/**
 * Displays user study goals and linked decks.
 */
export default async function Goals({ userId }: GoalsProps) {
	// ユーザーの目標を取得
	const goals = await getStudyGoalsByUser(userId);
	// それぞれの目標に紐づくデッキを取得
	const goalsWithDecks = await Promise.all(
		goals.map(async (goal) => ({
			...goal,
			decks: await getGoalDecks(goal.id),
		})),
	);
	// 日付フォーマットヘルパー
	const formatDate = (s: string | null): string =>
		s ? new Date(s).toLocaleString() : "-";

	return (
		<section className="space-y-4">
			<h2 className="text-lg font-semibold">目標管理</h2>
			{goalsWithDecks.length === 0 ? (
				<p>目標がありません。</p>
			) : (
				<div className="space-y-4">
					{goalsWithDecks.map((goal) => (
						<article key={goal.id} className="p-4 border rounded">
							<h3 className="text-md font-medium">{goal.title}</h3>
							<div className="grid grid-cols-2 gap-2 text-sm mt-2">
								<div>進捗率:</div>
								<div>{goal.progress_rate}%</div>
								<div>ステータス:</div>
								<div>{goal.status}</div>
								<div>期限:</div>
								<div>{formatDate(goal.deadline)}</div>
								<div>完了日時:</div>
								<div>{formatDate(goal.completed_at)}</div>
							</div>
							<div className="mt-3">
								<h4 className="text-sm font-medium mb-1">リンク済みデッキ</h4>
								{goal.decks.length === 0 ? (
									<p>なし</p>
								) : (
									<ul className="list-disc ml-5 text-sm">
										{goal.decks.map((d) => (
											<li key={d.id}>
												{d.title} ({d.card_count} 枚)
											</li>
										))}
									</ul>
								)}
							</div>
						</article>
					))}
				</div>
			)}
		</section>
	);
}
