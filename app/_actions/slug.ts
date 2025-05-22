"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Validate slug availability against notes and reserved_slugs tables
 * @param slug - The slug to validate
 * @returns Whether the slug is available
 */
export async function validateSlug(
	slug: string,
): Promise<{ available: boolean }> {
	const supabase = await createClient();

	// Check existing notes
	const { error: noteError, count: noteCount } = await supabase
		.from("notes")
		.select("id", { head: true, count: "exact" })
		.eq("slug", slug);
	if (noteError) throw new Error("ノートのSlug検証に失敗しました");

	// Check reserved slugs
	const { error: reservedError, count: reservedCount } = await supabase
		.from("reserved_slugs")
		.select("slug", { head: true, count: "exact" })
		.eq("slug", slug);
	if (reservedError) throw new Error("予約済Slug検証に失敗しました");

	return { available: (noteCount ?? 0) === 0 && (reservedCount ?? 0) === 0 };
}
