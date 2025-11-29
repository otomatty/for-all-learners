"use client";

/**
 * useNote フック
 *
 * スラッグでノートの詳細情報（メタデータ）を取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ app/(protected)/notes/[slug]/page.tsx
 *   └─ app/(protected)/notes/[slug]/layout.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/notes-repository.ts
 *   ├─ lib/supabase/client.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/notes/notes.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/204
 */

import { useQuery } from "@tanstack/react-query";
import type { LocalNote } from "@/lib/db/types";
import { notesRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

export interface NoteDetail {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	visibility: "public" | "unlisted" | "invite" | "private";
	created_at: string;
	updated_at: string;
	page_count: number;
	participant_count: number;
	owner_id: string;
	is_default_note: boolean;
}

/**
 * LocalNote から NoteDetail へのマッピング
 */
function toNoteDetail(note: LocalNote): NoteDetail {
	return {
		id: note.id,
		slug: note.slug,
		title: note.title,
		description: note.description,
		visibility: note.visibility,
		created_at: note.created_at,
		updated_at: note.updated_at,
		page_count: note.page_count,
		participant_count: note.participant_count,
		owner_id: note.owner_id,
		is_default_note: note.is_default_note ?? false,
	};
}

/**
 * ノートの詳細情報（メタデータ）を取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useNote(slug: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["note", slug],
		queryFn: async (): Promise<{ note: NoteDetail }> => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// ローカルDBからスラッグでノートを取得
			const note = await notesRepository.getBySlug(user.id, slug);

			if (!note) {
				throw new Error("Note not found");
			}

			return { note: toNoteDetail(note) };
		},
		enabled: !!slug,
	});
}
