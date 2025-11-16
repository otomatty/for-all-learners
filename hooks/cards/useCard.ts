"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Card = Database["public"]["Tables"]["cards"]["Row"];

/**
 * カード詳細を取得します。
 * @param id カードID
 */
export function useCard(id: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["cards", id],
		queryFn: async (): Promise<Card> => {
			const { data, error } = await supabase
				.from("cards")
				.select("*")
				.eq("id", id)
				.single();

			if (error) throw error;
			if (!data) throw new Error("Card not found");
			return data;
		},
		enabled: !!id,
	});
}
