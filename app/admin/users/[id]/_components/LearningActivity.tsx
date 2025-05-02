import React from "react";
import {
	getLearningLogsByUser,
	getReviewCardsByUser,
	getRecentActivityByUser,
} from "@/app/_actions/learning_logs";

interface LearningActivityProps {
	userId: string;
}

/**
 * 学習アクティビティを表示するコンポーネント。
 */
export default async function LearningActivity({
	userId,
}: LearningActivityProps) {
	// データ取得
	const logs = await getLearningLogsByUser(userId);
	const reviewLogs = await getReviewCardsByUser(userId);
	const recentLogs = await getRecentActivityByUser(userId);
	// 日付フォーマットヘルパー
	const formatDate = (s: string | null): string =>
		s ? new Date(s).toLocaleString() : "-";
	// 統計計算
	const total = logs.length;
	const correctCount = logs.filter((l) => l.is_correct).length;
	const correctRate =
		total > 0 ? ((correctCount / total) * 100).toFixed(2) : "-";
	return (
		<section className="space-y-4">
			<h2 className="text-lg font-semibold">学習アクティビティ</h2>
			<div className="grid grid-cols-2 gap-4 text-sm">
				<div>回答総数:</div>
				<div>{total}</div>
				<div>正答数:</div>
				<div>{correctCount}</div>
				<div>正答率:</div>
				<div>{correctRate}%</div>
			</div>
			<section>
				<h3 className="text-md font-medium mb-2">復習対象カード</h3>
				{reviewLogs.length === 0 ? (
					<p>なし</p>
				) : (
					<ul className="list-disc ml-5">
						{reviewLogs.map((log) => (
							<li key={log.id}>
								{log.card_id} - {formatDate(log.next_review_at)}
							</li>
						))}
					</ul>
				)}
			</section>
			<section>
				<h3 className="text-md font-medium mb-2">最近の学習</h3>
				{recentLogs.length === 0 ? (
					<p>なし</p>
				) : (
					<ul className="list-disc ml-5">
						{recentLogs.map((log) => (
							<li key={log.id}>
								{log.card_id} - {formatDate(log.answered_at)}
							</li>
						))}
					</ul>
				)}
			</section>
		</section>
	);
}
