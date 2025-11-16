"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ノートの共有を解除します。
 */
export function useUnshareNote() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			noteId,
			userId,
		}: {
			noteId: string;
			userId: string;
		}) => {
			const { error } = await supabase
				.from("note_shares")
				.delete()
				.eq("note_id", noteId)
				.eq("shared_with_user_id", userId);
			if (error) throw error;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
			queryClient.invalidateQueries({
				queryKey: ["note-shares", variables.noteId],
			});
		},
	});
}
