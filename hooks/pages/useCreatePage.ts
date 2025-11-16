"use client";

import type { JSONContent } from "@tiptap/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { extractFirstImageUrl } from "@/lib/utils/thumbnailExtractor";
import {
	deleteLinkOccurrencesByPage,
	syncLinkGroupsForPage,
	upsertLinkGroup,
	upsertLinkOccurrence,
} from "@/lib/services/linkGroupService";
import { extractLinksFromContent } from "@/lib/utils/extractLinksFromContent";
import { normalizeTitleToKey } from "@/lib/unilink/utils";
import { linkPageToDefaultNote } from "@/hooks/notes/useLinkPageToDefaultNote";
import type { Database } from "@/types/database.types";

/**
 * ページを作成します。
 * サムネイル自動生成、リンクグループ同期、デフォルトノートへのリンクを含みます。
 */
export function useCreatePage() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			page,
			autoGenerateThumbnail = true,
		}: {
			page: Omit<Database["public"]["Tables"]["pages"]["Insert"], "id">;
			autoGenerateThumbnail?: boolean;
		}) => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// 自動サムネイル生成が有効で、content_tiptapが存在する場合
			const pageWithThumbnail = { ...page };
			if (autoGenerateThumbnail && page.content_tiptap) {
				const thumbnailUrl = extractFirstImageUrl(
					page.content_tiptap as JSONContent,
				);
				if (thumbnailUrl) {
					pageWithThumbnail.thumbnail_url = thumbnailUrl;
				}
			}

			// ページ作成
			const { data, error } = await supabase
				.from("pages")
				.insert(pageWithThumbnail)
				.select()
				.single();
			if (error) throw error;

			// 1. Sync link groups for the new page
			if (data.content_tiptap) {
				const contentTiptap = data.content_tiptap as JSONContent;
				const links = extractLinksFromContent(contentTiptap);

				// Delete existing occurrences for this page
				await deleteLinkOccurrencesByPage(supabase, data.id);

				// Process each link
				for (const link of links) {
					// 1. Upsert link group
					const linkGroup = await upsertLinkGroup(supabase, {
						key: link.key,
						rawText: link.text,
						pageId: link.pageId,
					});

					// 2. Create link occurrence
					await upsertLinkOccurrence(supabase, {
						linkGroupId: linkGroup.id,
						sourcePageId: data.id,
						markId: link.markId,
						position: link.position,
					});
				}
			}

			// 2. Connect link groups that match this page title
			// If a link group exists with key matching this page title, update its page_id
			const normalizedKey = normalizeTitleToKey(data.title);
			const { data: existingLinkGroup } = await supabase
				.from("link_groups")
				.select("id")
				.eq("key", normalizedKey)
				.maybeSingle();

			if (existingLinkGroup) {
				await supabase
					.from("link_groups")
					.update({ page_id: data.id })
					.eq("key", normalizedKey);
			}

			// 3. Auto-link to default note (for /pages consolidation)
			try {
				await linkPageToDefaultNote(data.user_id, data.id);
			} catch {
				// Log but don't fail the page creation
				// The page can still be manually linked later
			}

			return data;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["pages"] });
			if (data.note_id) {
				queryClient.invalidateQueries({
					queryKey: ["pages", "by-note", data.note_id],
				});
			}
		},
	});
}

