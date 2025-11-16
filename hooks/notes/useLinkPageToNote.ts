"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ページをノートに紐付けます。
 */
export function useLinkPageToNote() {
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
			const { data, error } = await supabase
				.from("note_page_links")
				.insert([{ note_id: noteId, page_id: pageId }])
				.select("*")
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["note-pages"] });
			queryClient.invalidateQueries({ queryKey: ["note", variables.noteId] });
		},
	});
}
