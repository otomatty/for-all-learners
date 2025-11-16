"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ユーザーにノートを共有します。
 */
export function useShareNote() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			noteId,
			userId,
			permission,
		}: {
			noteId: string;
			userId: string;
			permission: "editor" | "viewer";
		}) => {
			const { data, error } = await supabase
				.from("note_shares")
				.insert([
					{
						note_id: noteId,
						shared_with_user_id: userId,
						permission_level: permission,
					},
				])
				.select("*")
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
			queryClient.invalidateQueries({
				queryKey: ["note-shares", variables.noteId],
			});
		},
	});
}
