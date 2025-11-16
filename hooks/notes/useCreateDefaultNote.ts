"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ユーザーのデフォルトノートを作成します。
 */
export function useCreateDefaultNote() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			// デフォルトノートのスラグは "all-pages" に統一
			const defaultSlug = "all-pages";

			const { data, error } = await supabase
				.from("notes")
				.insert([
					{
						owner_id: userId,
						slug: defaultSlug,
						title: "すべてのページ",
						description:
							"ユーザーが作成したすべてのページを含むデフォルトノート",
						visibility: "private",
					},
				])
				.select("*")
				.single();

			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
			queryClient.invalidateQueries({ queryKey: ["default-note"] });
		},
	});
}
