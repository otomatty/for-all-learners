"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get a Supabase client with our Database typing.
 */
export async function getSupabaseClient(): Promise<SupabaseClient<Database>> {
	return await createClient();
}
