import type { MilestoneEntry } from "@/app/(public)/milestones/_components/milestone-timeline";
import { mapRowToEntry } from "@/hooks/milestones/utils";
import { createClient } from "@/lib/supabase/server";
import MilestoneAdminView from "./_components/MilestoneAdminView";

export default async function MilestonesAdminPage() {
	const supabase = await createClient();

	// マイルストーン一覧を取得
	const { data, error } = await supabase
		.from("milestones")
		.select("*")
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(`Failed to fetch milestones: ${error.message}`);
	}

	const initialMilestones: MilestoneEntry[] = (data || []).map(mapRowToEntry);

	return (
		<div style={{ padding: "20px" }}>
			<h1>マイルストーン管理</h1>
			{/* クライアントコンポーネントに初期データを渡す */}
			<MilestoneAdminView initialMilestones={initialMilestones} />
		</div>
	);
}
