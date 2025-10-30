"use server";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
// Supabaseの型定義ファイルへのパスをプロジェクトに合わせて修正してください。
// 例: import type { Database } from '@/lib/database.types';
// この例では、プロジェクトルートの `lib` フォルダに `database.types.ts` があると仮定しています。
import type { Database } from "@/types/database.types"; // ← 実際のパスに置き換えてください

// フロントエンドで使われる型定義 (page.tsx と共通化も検討)
export interface Change {
	// id?: string; // DBのchangelog_items.id (もしクライアント側で必要なら)
	type: "new" | "improvement" | "fix" | "security";
	description: string;
}

export interface ChangeLogEntry {
	date: string; // "YYYY年MM月DD日" 形式
	version: string;
	id: string; // changelog_entries.id (UUID)
	title?: string | null;
	changes: Change[];
}

// アクションのレスポンス型
export interface ActionResponse<T = null> {
	success: boolean;
	data?: T;
	error?: string;
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
				// アイテム取得に失敗した場合、エントリ自体は表示し、変更点を空にする
			} else if (items) {
				changesForEntry = items.map((item) => ({
					type: item.type as ChangeTypeEnum, // Enums型はstring literal unionと互換性があるはず
					description: item.description,
				}));
			}

			changelogData.push({
				id: entry.id,
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
		const _errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred";
		return []; // 予期せぬエラー時も空配列を返す
	}
}

// --- CRUD アクション ---

export interface CreateChangelogEntryInput {
	version: string;
	title?: string | null;
	published_at: string; // YYYY-MM-DD 形式
	changes: Omit<Change, "id">[]; // id はDBで自動生成
}

export async function createChangelogEntry(
	input: CreateChangelogEntryInput,
): Promise<ActionResponse<ChangeLogEntry>> {
	const supabase = await createClient();

	try {
		// Check if an entry with this version already exists
		const { data: existingEntry, error: selectError } = await supabase
			.from("changelog_entries")
			.select("*")
			.eq("version", input.version)
			.maybeSingle();
		if (selectError) throw selectError;

		let entry = existingEntry;
		if (entry) {
			// Update existing entry's metadata
			const updateData: Partial<DbChangelogEntry> = {};
			if (input.title !== undefined) updateData.title = input.title;
			if (input.published_at) updateData.published_at = input.published_at;
			const { data: updatedEntry, error: updateError } = await supabase
				.from("changelog_entries")
				.update(updateData)
				.eq("id", entry.id)
				.select()
				.single();
			if (updateError || !updatedEntry) {
				return {
					success: false,
					error: updateError?.message || "Failed to update existing entry.",
				};
			}
			entry = updatedEntry;

			// Remove old items before inserting new ones
			const { error: deleteError } = await supabase
				.from("changelog_items")
				.delete()
				.eq("entry_id", entry.id);
			if (deleteError) {
				return {
					success: false,
					error: deleteError.message || "Failed to clear old items.",
				};
			}
		} else {
			// Create a new changelog entry
			const { data: newEntry, error: entryError } = await supabase
				.from("changelog_entries")
				.insert({
					version: input.version,
					title: input.title,
					published_at: input.published_at,
				})
				.select()
				.single();
			if (entryError || !newEntry) {
				return {
					success: false,
					error: entryError?.message || "Failed to create changelog entry.",
				};
			}
			entry = newEntry;
		}

		// Insert changelog items
		if (input.changes && input.changes.length > 0) {
			const itemsToInsert = input.changes.map((change, index) => ({
				entry_id: entry.id,
				type: change.type as ChangeTypeEnum,
				description: change.description,
				display_order: index,
			}));
			const { error: itemsError } = await supabase
				.from("changelog_items")
				.insert(itemsToInsert);
			if (itemsError) {
				return {
					success: false,
					error: itemsError.message || "Failed to create changelog items.",
				};
			}
		}

		revalidatePath("/changelog");

		return {
			success: true,
			data: {
				version: entry.version,
				title: entry.title,
				date: format(new Date(entry.published_at), "yyyy年MM月dd日", {
					locale: ja,
				}),
				changes: input.changes,
				id: entry.id,
			},
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "An unknown error occurred during creation.";
		return { success: false, error: errorMessage };
	}
}

export interface UpdateChangelogEntryInput {
	entryId: string; // 更新対象の changelog_entries.id (UUID)
	version?: string;
	title?: string | null;
	published_at?: string; // YYYY-MM-DD 形式
	changes?: Omit<Change, "id">[]; // 更新時は全置き換えを想定
}

export async function updateChangelogEntry(
	input: UpdateChangelogEntryInput,
): Promise<ActionResponse<ChangeLogEntry>> {
	const supabase = await createClient();

	try {
		// 1. changelog_entries テーブルの該当エントリを更新
		const entryUpdateData: Partial<DbChangelogEntry> = {};
		if (input.version) entryUpdateData.version = input.version;
		if (input.title !== undefined) entryUpdateData.title = input.title; // null を許容
		if (input.published_at) entryUpdateData.published_at = input.published_at;

		const { data: updatedEntry, error: entryError } = await supabase
			.from("changelog_entries")
			.update(entryUpdateData)
			.eq("id", input.entryId)
			.select()
			.single();

		if (entryError || !updatedEntry) {
			return {
				success: false,
				error: entryError?.message || "Failed to update changelog entry.",
			};
		}

		// 2. 既存の changelog_items を削除
		const { error: deleteItemsError } = await supabase
			.from("changelog_items")
			.delete()
			.eq("entry_id", input.entryId);

		if (deleteItemsError) {
			return {
				success: false,
				error: deleteItemsError.message || "Failed to clear old items.",
			};
		}

		// 3. 新しい changelog_items を挿入 (もしあれば)
		const changesToUse = input.changes || [];
		if (changesToUse.length > 0) {
			const itemsToInsert = changesToUse.map((change, index) => ({
				entry_id: updatedEntry.id,
				type: change.type as ChangeTypeEnum,
				description: change.description,
				display_order: index,
			}));
			const { error: itemsError } = await supabase
				.from("changelog_items")
				.insert(itemsToInsert);
			if (itemsError) {
				return {
					success: false,
					error: itemsError.message || "Failed to insert new items.",
				};
			}
		}

		revalidatePath("/changelog");

		return {
			success: true,
			data: {
				version: updatedEntry.version,
				title: updatedEntry.title,
				date: format(new Date(updatedEntry.published_at), "yyyy年MM月dd日", {
					locale: ja,
				}),
				changes: changesToUse,
				id: updatedEntry.id,
			},
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "An unknown error occurred during update.";
		return { success: false, error: errorMessage };
	}
}

export async function deleteChangelogEntry(
	entryId: string,
): Promise<ActionResponse> {
	const supabase = await createClient();
	try {
		const { error } = await supabase
			.from("changelog_entries")
			.delete()
			.eq("id", entryId);

		if (error) {
			return {
				success: false,
				error: error.message || "Failed to delete changelog entry.",
			};
		}

		revalidatePath("/changelog");
		return { success: true };
	} catch (error) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "An unknown error occurred during deletion.";
		return { success: false, error: errorMessage };
	}
}
