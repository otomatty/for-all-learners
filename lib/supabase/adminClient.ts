import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Creates a server-side Supabase client with the Service Role key.
 * Use this for privileged admin API calls only.
 */
export function createAdminClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error("Missing Supabase URL or Service Role Key");
	}
	return createClient<Database>(url, key);
}
