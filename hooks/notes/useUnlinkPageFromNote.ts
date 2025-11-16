"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ノートからページの紐付けを解除します。
 */
export function useUnlinkPageFromNote() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			noteId,
			pageId,
		}: {
			noteId: string;
			pageId: string;
		}) => {
			const { error } = await supabase
				.from("note_page_links")
				.delete()
				.eq("note_id", noteId)
				.eq("page_id", pageId);
			if (error) throw error;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["note-pages"] });
			queryClient.invalidateQueries({ queryKey: ["note", variables.noteId] });
		},
	});
}
