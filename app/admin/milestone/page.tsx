// "use client"; // クライアントコンポーネント指定を削除

import { getMilestones } from "@/app/_actions/milestone";
import MilestoneAdminView from "./_components/milestone-admin-view"; // 新しいクライアントコンポーネントをインポート

export default async function MilestonesAdminPage() {
	// サーバーコンポーネント内でデータを取得
	const initialMilestones = await getMilestones();
	// エラーハンドリングが必要な場合はここで行う
	// 例: try-catchで囲み、エラーページを表示するなど

	return (
		<div style={{ padding: "20px" }}>
			<h1>マイルストーン管理</h1>
			{/* クライアントコンポーネントに初期データを渡す */}
			<MilestoneAdminView initialMilestones={initialMilestones} />
		</div>
	);
}
