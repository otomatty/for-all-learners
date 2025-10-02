import { createClient } from "@/lib/supabase/client";

/**
 * Search pages by title using a partial match.
 * @param query The substring to search in page titles.
 * @returns An array of objects with id and title of matching pages.
 */
export async function searchPages(
  query: string
): Promise<Array<{ id: string; title: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, title, updated_at")
    .ilike("title", `%${query}%`)
    .order("updated_at", { ascending: true })
    .limit(5);
  if (error) {
    console.error("searchPages error:", error);
    return [];
  }
  return (data ?? []).map(({ id, title }) => ({ id, title }));
}
