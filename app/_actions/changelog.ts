"use server";

import { format } from "date-fns";
import { ja } from "date-fns/locale";

// Supabaseの型定義ファイルへのパスをプロジェクトに合わせて修正してください。
// 例: import type { Database } from '@/lib/database.types';
// この例では、プロジェクトルートの `lib` フォルダに `database.types.ts` があると仮定しています。
import type { Database } from "@/types/database.types"; // ← 実際のパスに置き換えてください
import { createClient } from "@/lib/supabase/server";

// フロントエンドで使われる型定義 (page.tsx と共通化も検討)
export interface Change {
	type: "new" | "improvement" | "fix" | "security";
	description: string;
}

export interface ChangeLogEntry {
	date: string; // "YYYY年MM月DD日" 形式
	version: string;
	title?: string | null;
	changes: Change[];
}

// Supabaseのテーブル型エイリアス
type DbChangelogEntry =
	Database["public"]["Tables"]["changelog_entries"]["Row"];
// type DbChangelogItem = Database['public']['Tables']['changelog_items']['Row']; // 直接は使わないが参考
type ChangeTypeEnum = Database["public"]["Enums"]["change_type_enum"];

export async function getChangelogData(): Promise<ChangeLogEntry[]> {
	const supabase = await createClient();

	try {
		const { data: entries, error: entriesError } = await supabase
			.from("changelog_entries")
			.select("id, version, title, published_at")
			.order("published_at", { ascending: false });

		if (entriesError) {
			console.error("Error fetching changelog entries:", entriesError.message);
			// 本番環境ではより詳細なロギングやエラー通知を検討してください
			return []; // エラー時は空配列を返す
		}

		if (!entries) {
			return [];
		}

		const changelogData: ChangeLogEntry[] = [];

		for (const entry of entries as DbChangelogEntry[]) {
			const { data: items, error: itemsError } = await supabase
				.from("changelog_items")
				.select("type, description")
				.eq("entry_id", entry.id)
				.order("display_order", { ascending: true });

			let changesForEntry: Change[] = [];
			if (itemsError) {
				console.error(
					`Error fetching items for entry ${entry.version}:`,
					itemsError.message,
				);
				// アイテム取得に失敗した場合、エントリ自体は表示し、変更点を空にする
			} else if (items) {
				changesForEntry = items.map((item) => ({
					type: item.type as ChangeTypeEnum, // Enums型はstring literal unionと互換性があるはず
					description: item.description,
				}));
			}

			changelogData.push({
				date: format(new Date(entry.published_at), "yyyy年MM月dd日", {
					locale: ja,
				}),
				version: entry.version,
				title: entry.title, // title は null の可能性あり
				changes: changesForEntry,
			});
		}

		return changelogData;
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred";
		console.error("Failed to get changelog data:", errorMessage);
		return []; // 予期せぬエラー時も空配列を返す
	}
}
