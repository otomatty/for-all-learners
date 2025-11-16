"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * 公開ノートのスラグからノートに参加（エディタ権限で共有）します。
 */
export function useJoinNotePublic() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (slug: string) => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data: note, error: noteError } = await supabase
				.from("notes")
				.select("id")
				.eq("slug", slug)
				.eq("visibility", "public")
				.single();
			if (noteError || !note) throw noteError;

			const { data, error } = await supabase
				.from("note_shares")
				.insert([
					{
						note_id: note.id,
						shared_with_user_id: user.id,
						permission_level: "editor",
					},
				])
				.select("*")
				.single();
			if (error) throw error;

			// TODO: ユーザーページ自動作成・紐付け
			// これは Server Actions の ensureUserPageInNote に相当する機能が必要
			// 現時点ではスキップ（後で実装）

			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
		},
	});
}
