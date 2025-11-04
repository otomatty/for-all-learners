"use server";

import { ensureUserPageInNote, getUserInfo } from "../user-page";
import { getSupabaseClient } from "./getSupabaseClient";

/**
 * 公開ノートのスラグからノートに参加（エディタ権限で共有）します。
 *
 * @example
 * ```ts
 * import { joinNotePublic } from "@/app/_actions/notes";
 *
 * const joinRecord = await joinNotePublic("public-note-1");
 * console.log("参加レコード:", joinRecord);
 * ```
 *
 * @param slug 参加する公開ノートのスラグ
 * @returns 参加したノートの共有レコード
 */
export async function joinNotePublic(slug: string) {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	const { data: note, error: noteError } = await supabase
		.from("notes")
		.select("id")
		.eq("slug", slug)
		.eq("visibility", "public")
		.single();
	if (noteError || !note) throw noteError;

	const { data, error } = await supabase
		.from("note_shares")
		.insert([
			{
				note_id: note.id,
				shared_with_user_id: user.id,
				permission_level: "editor",
			},
		])
		.select("*")
		.single();
	if (error) throw error;

	// ✅ 新規追加: ユーザーページ自動作成・紐付け
	try {
		const userInfo = await getUserInfo(user.id);

		if (userInfo.userSlug) {
			const _userPageResult = await ensureUserPageInNote({
				userId: user.id,
				userSlug: userInfo.userSlug,
				noteId: note.id,
				avatarUrl: userInfo.avatarUrl,
				fullName: userInfo.fullName,
			});
		} else {
		}
	} catch (_userPageError) {}

	return data;
}
