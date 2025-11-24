import { getMilestonesServer } from "@/lib/services/milestonesService";
import MilestoneAdminView from "./_components/MilestoneAdminView";

export default async function MilestonesAdminPage() {
	// マイルストーン一覧を取得（既存フックのロジックを再利用）
	const initialMilestones = await getMilestonesServer();

	return (
		<div style={{ padding: "20px" }}>
			<h1>マイルストーン管理</h1>
			{/* クライアントコンポーネントに初期データを渡す */}
			<MilestoneAdminView initialMilestones={initialMilestones} />
		</div>
	);
}
