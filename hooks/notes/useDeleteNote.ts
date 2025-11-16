"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ノートを削除します。
 * デフォルトノート（is_default_note = true）は削除できません。
 */
export function useDeleteNote() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			// Check if the note is a default note
			const { data: note, error: fetchError } = await supabase
				.from("notes")
				.select("is_default_note")
				.eq("id", id)
				.single();

			if (fetchError) {
				throw new Error("ノートの情報取得に失敗しました。");
			}

			if (note?.is_default_note) {
				throw new Error("デフォルトノートは削除できません。");
			}

			// Delete the note
			const { error } = await supabase.from("notes").delete().eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
		},
	});
}
