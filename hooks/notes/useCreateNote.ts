"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateNotePayload } from "@/app/_actions/notes/types";
import { createClient } from "@/lib/supabase/client";

/**
 * ノートを作成します。
 */
export function useCreateNote() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateNotePayload) => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { slug, title, description, visibility } = payload;
			const { data, error } = await supabase
				.from("notes")
				.insert([{ owner_id: user.id, slug, title, description, visibility }])
				.select("*")
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
		},
	});
}
