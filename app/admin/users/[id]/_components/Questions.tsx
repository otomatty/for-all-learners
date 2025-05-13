import { getQuestionsByUser } from "@/app/_actions/questions";
import React from "react";

interface QuestionsProps {
	userId: string;
}

/**
 * Displays question variation statistics for a user.
 */
export default async function Questions({ userId }: QuestionsProps) {
	// サーバーアクションでユーザーの質問バリエーションを取得
	const questions = await getQuestionsByUser(userId);
	// 種類ごと件数を集計
	const countByType = questions.reduce(
		(acc, q) => {
			acc[q.type] = (acc[q.type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	return (
		<section className="space-y-2">
			<h2 className="text-lg font-semibold">問題バリエーション</h2>
			<p>全問題数: {questions.length}</p>
			{questions.length === 0 ? (
				<p>問題バリエーションがありません。</p>
			) : (
				<ul className="list-disc ml-5">
					{Object.entries(countByType).map(([type, count]) => (
						<li key={type}>
							{type}: {count} 件
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
