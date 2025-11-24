"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type DbChangelogEntry =
	Database["public"]["Tables"]["changelog_entries"]["Row"];
type ChangeTypeEnum = Database["public"]["Enums"]["change_type_enum"];

export interface Change {
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

export interface ActionResponse<T = null> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface CreateChangelogEntryInput {
	version: string;
	title?: string | null;
	published_at: string; // YYYY-MM-DD 形式
	changes: Omit<Change, "id">[];
}

export interface UpdateChangelogEntryInput {
	entryId: string;
	version?: string;
	title?: string | null;
	published_at?: string;
	changes?: Omit<Change, "id">[];
}

/**
 * Hook for fetching changelog data
 */
export function useChangelogData() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["changelog"],
		queryFn: async (): Promise<ChangeLogEntry[]> => {
			const { data: entries, error: entriesError } = await supabase
				.from("changelog_entries")
				.select("id, version, title, published_at")
				.order("published_at", { ascending: false });

			if (entriesError || !entries) {
				return [];
			}

			// Extract entry IDs for batch fetching
			const entryIds = entries.map((entry) => entry.id);

			// Fetch all changelog items in a single query
			const { data: allItems } = await supabase
				.from("changelog_items")
				.select("entry_id, type, description")
				.in("entry_id", entryIds)
				.order("display_order", { ascending: true });

			// Group items by entry_id
			const itemsByEntryId = (allItems || []).reduce<Record<string, Change[]>>(
				(acc, item) => {
					if (!acc[item.entry_id]) {
						acc[item.entry_id] = [];
					}
					acc[item.entry_id].push({
						type: item.type as ChangeTypeEnum,
						description: item.description,
					});
					return acc;
				},
				{},
			);

			// Map entries to ChangeLogEntry format
			return entries.map((entry) => ({
				id: entry.id,
				date: format(new Date(entry.published_at), "yyyy年MM月dd日", {
					locale: ja,
				}),
				version: entry.version,
				title: entry.title,
				changes: itemsByEntryId[entry.id] || [],
			}));
		},
	});
}

/**
 * Hook for creating changelog entry
 */
export function useCreateChangelogEntry() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			input: CreateChangelogEntryInput,
		): Promise<ActionResponse<ChangeLogEntry>> => {
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
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["changelog"] });
		},
	});
}

/**
 * Hook for updating changelog entry
 */
export function useUpdateChangelogEntry() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			input: UpdateChangelogEntryInput,
		): Promise<ActionResponse<ChangeLogEntry>> => {
			try {
				// 1. changelog_entries テーブルの該当エントリを更新
				const entryUpdateData: Partial<DbChangelogEntry> = {};
				if (input.version) entryUpdateData.version = input.version;
				if (input.title !== undefined) entryUpdateData.title = input.title;
				if (input.published_at)
					entryUpdateData.published_at = input.published_at;

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

				return {
					success: true,
					data: {
						version: updatedEntry.version,
						title: updatedEntry.title,
						date: format(
							new Date(updatedEntry.published_at),
							"yyyy年MM月dd日",
							{
								locale: ja,
							},
						),
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
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["changelog"] });
		},
	});
}

/**
 * Hook for deleting changelog entry
 */
export function useDeleteChangelogEntry() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (entryId: string): Promise<ActionResponse> => {
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

				return { success: true };
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "An unknown error occurred during deletion.";
				return { success: false, error: errorMessage };
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["changelog"] });
		},
	});
}
