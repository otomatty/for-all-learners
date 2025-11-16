"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ノート用の共有リンクを生成します。
 */
export function useGenerateNoteShareLink() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			noteId,
			permission,
		}: {
			noteId: string;
			permission: "viewer";
		}) => {
			// Generate UUID using crypto.randomUUID() (browser API)
			const token = crypto.randomUUID();
			const { data, error } = await supabase
				.from("share_links")
				.insert([
					{
						resource_type: "note",
						resource_id: noteId,
						token,
						permission_level: permission,
					},
				])
				.select("*")
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["note-share-links", variables.noteId],
			});
		},
	});
}
