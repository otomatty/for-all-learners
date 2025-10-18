"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * Get a Supabase client with our Database typing.
 */
export async function getSupabaseClient(): Promise<SupabaseClient<Database>> {
	return await createClient();
}
