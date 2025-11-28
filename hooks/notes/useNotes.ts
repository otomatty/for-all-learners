"use client";

/**
 * useNotes フック
 *
 * ユーザーが所有または共有されたノートの一覧を取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ app/(protected)/notes/page.tsx
 *   ├─ app/(protected)/notes/explorer/_components/NotesExplorerPageClient.tsx
 *   └─ app/(protected)/notes/layout.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/notes-repository.ts
 *   ├─ lib/supabase/client.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/notes/notes.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/198
 */

import { useQuery } from "@tanstack/react-query";
import type { LocalNote } from "@/lib/db/types";
import { notesRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

/**
 * ノートのサマリー情報（UI表示用）
 *
 * 既存のインターフェースを維持して後方互換性を確保
 */
export interface NoteSummary {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	visibility: "public" | "unlisted" | "invite" | "private";
	pageCount: number;
	participantCount: number;
	updatedAt: string;
}

/**
 * LocalNote から NoteSummary へのマッピング
 */
function toNoteSummary(note: LocalNote): NoteSummary {
	return {
		id: note.id,
		slug: note.slug,
		title: note.title,
		description: note.description,
		visibility: note.visibility,
		pageCount: note.page_count,
		participantCount: note.participant_count,
		updatedAt: note.updated_at,
	};
}

/**
 * ユーザーが所有または共有されたノートの一覧を取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 * - 共有ノートも含めて取得（サーバーから）
 */
export function useNotes() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["notes"],
		queryFn: async (): Promise<NoteSummary[]> => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			try {
				// ローカルDBから所有ノートを取得
				const ownedNotes = await notesRepository.getAll(user.id);

				// サーバーから共有ノートを取得（将来的にはRepositoryに移行）
				const { data: sharedLinks, error: sharedError } = await supabase
					.from("note_shares")
					.select("note_id")
					.eq("shared_with_user_id", user.id);
				if (sharedError) throw sharedError;

				const sharedNoteIds = sharedLinks.map((s) => s.note_id);
				const { data: sharedNotes, error: sharedNotesError } =
					sharedNoteIds.length
						? await supabase
								.from("notes")
								.select(
									"id, slug, title, description, visibility, updated_at, page_count, participant_count",
								)
								.in("id", sharedNoteIds)
						: { data: [], error: null };
				if (sharedNotesError) throw sharedNotesError;

				// 共有ノートをNoteSummary形式にマッピング
				const sharedNoteSummaries: NoteSummary[] = sharedNotes.map((n) => ({
					id: n.id,
					slug: n.slug,
					title: n.title,
					description: n.description,
					visibility: n.visibility as NoteSummary["visibility"],
					pageCount: n.page_count,
					participantCount: n.participant_count,
					updatedAt: n.updated_at || "",
				}));

				// 所有ノートをNoteSummary形式にマッピング
				const ownedNoteSummaries = ownedNotes.map(toNoteSummary);

				// 所有ノートと共有ノートをマージ（重複排除）
				const allNotes = [...ownedNoteSummaries, ...sharedNoteSummaries];
				const uniqueNotesMap = new Map(allNotes.map((note) => [note.id, note]));

				return Array.from(uniqueNotesMap.values());
			} catch (error) {
				// RepositoryError を含むすべてのエラーをそのままスローし、
				// react-query のエラーハンドリングに委ねます。
				// これにより、呼び出し側で useRepositoryError フックが
				// RepositoryError のインスタンスを正しく判定できるようになります。
				throw error;
			}
		},
	});
}
