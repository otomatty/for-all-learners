"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateNotePayload } from "@/app/_actions/notes/types";
import { createClient } from "@/lib/supabase/client";

/**
 * ノートを更新します。
 */
export function useUpdateNote() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			payload,
		}: {
			id: string;
			payload: UpdateNotePayload;
		}) => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data: existing, error: fetchError } = await supabase
				.from("notes")
				.select("visibility")
				.eq("id", id)
				.single();
			if (fetchError || !existing) throw fetchError;

			const oldVisibility = existing.visibility;
			const newVisibility = payload.visibility;

			const { data: updated, error: updateError } = await supabase
				.from("notes")
				.update(payload)
				.eq("id", id)
				.select("*")
				.single();
			if (updateError) throw updateError;

			// If visibility changed, clear existing shares and links
			if (newVisibility && newVisibility !== oldVisibility) {
				const { error: delSharesError } = await supabase
					.from("note_shares")
					.delete()
					.eq("note_id", id)
					.neq("shared_with_user_id", user.id);
				if (delSharesError) throw delSharesError;

				const { error: delLinksError } = await supabase
					.from("share_links")
					.delete()
					.eq("resource_type", "note")
					.eq("resource_id", id);
				if (delLinksError) throw delLinksError;
			}

			return updated;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
			queryClient.invalidateQueries({ queryKey: ["note", variables.id] });
		},
	});
}
