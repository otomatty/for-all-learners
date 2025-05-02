"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * Server action to insert raw OCR input into raw_inputs table.
 */
export async function createRawInput(
	input: Omit<Database["public"]["Tables"]["raw_inputs"]["Insert"], "id">,
): Promise<Database["public"]["Tables"]["raw_inputs"]["Row"]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("raw_inputs")
		.insert(input)
		.select()
		.single();
	if (error) throw error;
	if (!data) throw new Error("createRawInput: no data returned");
	return data;
}
