import { createClient } from "@/lib/supabase/server";

interface LearningActivityProps {
	userId: string;
}

/**
 * 学習アクティビティを表示するコンポーネント。
 */
export default async function LearningActivity({
	userId,
}: LearningActivityProps) {
	// 直接Supabaseクエリでデータ取得
	const supabase = await createClient();

	// Get learning logs
	const { data: logs, error: logsError } = await supabase
		.from("learning_logs")
		.select("*")
		.eq("user_id", userId)
		.order("answered_at", { ascending: false });

	if (logsError) {
		throw new Error(`学習ログの取得に失敗しました: ${logsError.message}`);
	}

	// Get review cards (cards with next_review_at in the past)
	const { data: reviewLogs, error: reviewError } = await supabase
		.from("learning_logs")
		.select("*")
		.eq("user_id", userId)
		.not("next_review_at", "is", null)
		.lte("next_review_at", new Date().toISOString())
		.order("next_review_at", { ascending: true });

	if (reviewError) {
		throw new Error(`復習カードの取得に失敗しました: ${reviewError.message}`);
	}

	// Get recent activity (last 10 logs)
	const { data: recentLogs, error: recentError } = await supabase
		.from("learning_logs")
		.select("*")
		.eq("user_id", userId)
		.order("answered_at", { ascending: false })
		.limit(10);

	if (recentError) {
		throw new Error(`最近の学習の取得に失敗しました: ${recentError.message}`);
	}
	// 日付フォーマットヘルパー
	const formatDate = (s: string | null): string =>
		s ? new Date(s).toLocaleString() : "-";
	// 統計計算
	const total = logs?.length ?? 0;
	const correctCount = (logs || []).filter((l) => l.is_correct).length;
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
				{(reviewLogs?.length ?? 0) === 0 ? (
					<p>なし</p>
				) : (
					<ul className="list-disc ml-5">
						{(reviewLogs || []).map((log) => (
							<li key={log.id}>
								{log.card_id} - {formatDate(log.next_review_at)}
							</li>
						))}
					</ul>
				)}
			</section>
			<section>
				<h3 className="text-md font-medium mb-2">最近の学習</h3>
				{(recentLogs?.length ?? 0) === 0 ? (
					<p>なし</p>
				) : (
					<ul className="list-disc ml-5">
						{(recentLogs || []).map((log) => (
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
