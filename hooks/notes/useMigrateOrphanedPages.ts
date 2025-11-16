"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLinkPageToNote } from "./useLinkPageToNote";

export interface MigrateOrphanedPagesResult {
	migratedCount: number;
	orphanedPages: Array<{ id: string; title: string }>;
}

/**
 * 既存のノートに紐付いていないページをデフォルトノートに移行します。
 */
export function useMigrateOrphanedPages() {
	const supabase = createClient();
	const queryClient = useQueryClient();
	const linkPageToNote = useLinkPageToNote();

	return useMutation({
		mutationFn: async (): Promise<MigrateOrphanedPagesResult> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// デフォルトノートを取得
			const { data: defaultNote, error: defaultNoteError } = await supabase
				.from("notes")
				.select("id")
				.eq("owner_id", user.id)
				.eq("is_default_note", true)
				.maybeSingle();

			if (defaultNoteError) throw defaultNoteError;
			if (!defaultNote) {
				throw new Error("Default note not found");
			}

			// ユーザーの全ページを取得
			const { data: userPages, error: pagesError } = await supabase
				.from("pages")
				.select("id, title")
				.eq("user_id", user.id);

			if (pagesError) throw pagesError;

			if (!userPages || userPages.length === 0) {
				return { migratedCount: 0, orphanedPages: [] };
			}

			// 既にリンクされているページのIDを取得
			const { data: linkedPages, error: linksError } = await supabase
				.from("note_page_links")
				.select("page_id")
				.in(
					"page_id",
					userPages.map((p) => p.id),
				);

			if (linksError) throw linksError;

			const linkedPageIds = new Set(
				linkedPages?.map((link) => link.page_id) || [],
			);

			// リンクされていないページを特定
			const orphanedPages = userPages.filter(
				(page) => !linkedPageIds.has(page.id),
			);

			if (orphanedPages.length === 0) {
				return { migratedCount: 0, orphanedPages: [] };
			}

			// 孤立ページをデフォルトノートにリンク
			for (const page of orphanedPages) {
				await linkPageToNote.mutateAsync({
					noteId: defaultNote.id,
					pageId: page.id,
				});
			}

			return {
				migratedCount: orphanedPages.length,
				orphanedPages: orphanedPages.map((p) => ({ id: p.id, title: p.title })),
			};
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["note-pages"] });
			queryClient.invalidateQueries({ queryKey: ["all-user-pages"] });
		},
	});
}
