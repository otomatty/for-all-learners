"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * ページをユーザーのデフォルトノートにリンクします。
 * これはクライアント側で使用できるユーティリティ関数です。
 *
 * @param userId - ユーザーID
 * @param pageId - ページID
 * @returns 成功した場合 true
 */
export async function linkPageToDefaultNote(
	userId: string,
	pageId: string,
): Promise<boolean> {
	const supabase = createClient();

	// Get default note
	const { data: defaultNote, error: noteError } = await supabase
		.from("notes")
		.select("id")
		.eq("owner_id", userId)
		.eq("is_default_note", true)
		.maybeSingle();

	if (noteError) {
		throw noteError;
	}

	if (!defaultNote) {
		throw new Error("Default note not found");
	}

	// Check if link already exists
	const { data: existingLink } = await supabase
		.from("note_page_links")
		.select("id")
		.eq("note_id", defaultNote.id)
		.eq("page_id", pageId)
		.maybeSingle();

	if (existingLink) {
		return true; // Already linked
	}

	// Create link
	const { error } = await supabase
		.from("note_page_links")
		.insert({ note_id: defaultNote.id, page_id: pageId });

	if (error) {
		throw new Error("ページのリンクに失敗しました");
	}

	return true;
}
