"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteLinkOccurrencesByPage } from "@/lib/services/linkGroupService";
import { createClient } from "@/lib/supabase/client";

/**
 * ページを削除します。
 * 削除前にリンクグループの関連データも削除します。
 */
export function useDeletePage() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// Delete link group occurrences for this page
			await deleteLinkOccurrencesByPage(supabase, id);

			// Delete the page
			const { data, error } = await supabase
				.from("pages")
				.delete()
				.eq("id", id)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pages"] });
		},
	});
}
