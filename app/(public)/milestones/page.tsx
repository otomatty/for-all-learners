import { getMilestones } from "../../_actions/milestone"; // 作成したサーバーアクションをインポート
import type { Metadata } from "next";
import MilestoneTimeline, {
	type MilestoneEntry,
} from "./_components/milestone-timeline"; // クライアントコンポーネントをインポート

export const metadata: Metadata = {
	title: "マイルストーン - For All Learners",
	description:
		"For All Learners アプリケーションの今後の開発計画と目標をご紹介します。",
};

export default async function MilestonesPage() {
	// サーバーアクションを呼び出してデータを取得
	const milestoneData = await getMilestones();

	return (
		<div className="flex flex-col min-h-screen">
			<header className="container mx-auto px-4 sm:px-6 py-8 text-center shrink-0">
				<h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
					マイルストーン
				</h1>
				<p className="mt-3 text-md text-muted-foreground">
					For All Learners の今後の開発計画と達成済みの目標をご紹介します。
				</p>
			</header>

			<MilestoneTimeline milestones={milestoneData} />
		</div>
	);
}
