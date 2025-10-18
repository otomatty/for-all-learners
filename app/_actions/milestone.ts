"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types"; // 生成されたDatabase型をインポート
import type { MilestoneEntry } from "../(public)/milestones/_components/milestone-timeline";

// Supabaseのmilestonesテーブルの行の型エイリアス
type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];

// SupabaseのmilestonesテーブルのInsert型とUpdate型
export type MilestoneInsert =
	Database["public"]["Tables"]["milestones"]["Insert"];
export type MilestoneUpdate =
	Database["public"]["Tables"]["milestones"]["Update"];

// MilestoneRowをMilestoneEntry型にマッピングするヘルパー関数
function mapRowToEntry(item: MilestoneRow): MilestoneEntry {
	// item.status は Supabaseのenum型 (例: 'planning' | 'in-progress' | ...) になるはず
	// MilestoneEntry['status'] と互換性があるか確認
	const status = item.status as MilestoneEntry["status"];

	// item.related_links は JSONB型なので、適切な型アサーションが必要
	const relatedLinks = item.related_links as
		| { label: string; url: string }[]
		| null;
	// item.features は JSONB型
	const features = item.features as string[] | null; // featuresがDB内でstring[]として保存されていると仮定

	return {
		id: item.id,
		timeframe: item.timeframe,
		title: item.title,
		description: item.description || "", // descriptionがnullの場合、空文字に
		status: status,
		progress: item.progress ?? undefined, // nullの場合はundefinedに
		imageUrl: item.image_url ?? undefined, // nullの場合はundefinedに
		features: features ?? undefined, // nullの場合はundefinedに
		relatedLinks: relatedLinks ?? undefined, // nullの場合はundefinedに
		sort_order: item.sort_order, // sort_order をマッピング
	};
}

export async function getMilestones(): Promise<MilestoneEntry[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("milestones")
		.select() // すべてのカラムを選択するように変更
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
	return data.map(mapRowToEntry);
}

export async function createMilestone(
	milestoneData: MilestoneInsert,
): Promise<MilestoneEntry | null> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("milestones")
		.insert(milestoneData)
		.select()
		.single();

	if (error) {
		console.error("Error creating milestone in Supabase:", error.message);
		return null;
	}

	if (!data) {
		console.error("No data returned after creating milestone.");
		return null;
	}

	revalidatePath("/admin/milestone"); // 管理ページのパスを再検証
	return mapRowToEntry(data as MilestoneRow);
}

export async function updateMilestone(
	id: string,
	milestoneUpdates: MilestoneUpdate,
): Promise<MilestoneEntry | null> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("milestones")
		.update(milestoneUpdates)
		.eq("id", id)
		.select()
		.single();

	if (error) {
		console.error(`Error updating milestone ${id} in Supabase:`, error.message);
		return null;
	}

	if (!data) {
		console.error(`No data returned after updating milestone ${id}.`);
		return null;
	}

	revalidatePath("/admin/milestone"); // 管理ページを再検証
	return mapRowToEntry(data as MilestoneRow);
}

export async function deleteMilestone(
	id: string,
): Promise<{ success: boolean; error?: string }> {
	const supabase = await createClient();

	const { error } = await supabase.from("milestones").delete().eq("id", id);

	if (error) {
		console.error(
			`Error deleting milestone ${id} from Supabase:`,
			error.message,
		);
		return { success: false, error: error.message };
	}

	revalidatePath("/admin/milestone"); // 管理ページを再検証
	return { success: true };
}
