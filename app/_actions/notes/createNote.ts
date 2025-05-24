"use server";

import { getSupabaseClient } from "./getSupabaseClient";
import type { CreateNotePayload } from "./types";

/**
 * ノートを作成します。
 *
 * @example
 * ```ts
 * import { createNote } from "@/app/_actions/notes";
 *
 * const newNote = await createNote({
 *   slug: "my-note",
 *   title: "タイトル",
 *   description: "説明文",
 *   visibility: "private",
 * });
 * console.log("作成されたノート:", newNote);
 * ```
 *
 * @param payload ノート作成時のペイロード
 * @param payload.slug 一意なスラグ（URLに使用）
 * @param payload.title ノートのタイトル
 * @param payload.description ノートの説明（省略可）
 * @param payload.visibility 公開範囲（"public" | "unlisted" | "invite" | "private"）（省略可）
 * @returns 作成されたノートレコード
 */
export async function createNote(payload: CreateNotePayload) {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	const { slug, title, description, visibility } = payload;
	const { data, error } = await supabase
		.from("notes")
		.insert([{ owner_id: user.id, slug, title, description, visibility }])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}
