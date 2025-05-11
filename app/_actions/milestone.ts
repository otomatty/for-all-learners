"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types"; // 生成されたDatabase型をインポート
import type { MilestoneEntry } from "../(public)/milestones/_components/milestone-timeline";

// Supabaseのmilestonesテーブルの行の型エイリアス
type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];

export async function getMilestones(): Promise<MilestoneEntry[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("milestones")
		.select(` 
      id,
      milestone_id,
      timeframe,
      title,
      description,
      status,
      progress,
      image_url,
      features,
      related_links,
      sort_order
    `) // コメントを削除
		.order("sort_order", { ascending: true }) // sort_orderで昇順
		.order("created_at", { ascending: false }); // 次に作成日時の降順 (新しいものが優先されるように)

	if (error) {
		console.error("Error fetching milestones from Supabase:", error.message);
		return []; // エラー時は空配列を返す (本番環境ではより堅牢なエラー処理を検討)
	}

	if (!data) {
		return [];
	}

	// Supabaseからのデータ (dataは MilestoneRow[] 型になる) をMilestoneEntry型にマッピング
	return data.map((item): MilestoneEntry => {
		// itemの型注釈 MilestoneRow を削除
		// item.status は Supabaseのenum型 (例: 'planning' | 'in-progress' | ...) になるはず
		// MilestoneEntry['status'] と互換性があるか確認
		const status = item.status as MilestoneEntry["status"];

		// item.related_links は JSONB型なので、any または適切な型アサーションが必要な場合がある
		const relatedLinks = item.related_links as
			| { label: string; url: string }[]
			| null;

		return {
			id: item.id,
			timeframe: item.timeframe,
			title: item.title,
			description: item.description || "",
			status: status,
			progress: item.progress ?? undefined,
			imageUrl: item.image_url ?? undefined,
			features: item.features ?? undefined,
			relatedLinks: relatedLinks ?? undefined,
		};
	});
}
