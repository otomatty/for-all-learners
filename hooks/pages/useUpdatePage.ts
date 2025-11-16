"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

/**
 * ページを更新します。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ [使用しているファイルがあれば記載]
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   ├─ @/lib/supabase/client
 *   └─ @/types/database.types
 *
 * Related Documentation:
 *   └─ docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function useUpdatePage() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: Database["public"]["Tables"]["pages"]["Update"];
		}) => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("pages")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["pages"] });
			queryClient.invalidateQueries({ queryKey: ["pages", data.id] });
		},
	});
}
