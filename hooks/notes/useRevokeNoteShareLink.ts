"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * 共有リンクを無効化（失効）します。
 */
export function useRevokeNoteShareLink() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (token: string) => {
			const { error } = await supabase
				.from("share_links")
				.update({ expires_at: new Date().toISOString() })
				.eq("token", token);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["note-share-links"] });
		},
	});
}
