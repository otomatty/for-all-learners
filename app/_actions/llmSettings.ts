"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type LlmSettingsRow = Database["public"]["Tables"]["user_llm_settings"]["Row"];

/**
 * Fetches the current authenticated user's LLM settings (encrypted API key included).
 * Returns null if not set.
 */
export async function getUserLlmSettings(): Promise<LlmSettingsRow | null> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("user_llm_settings")
		.select("*")
		.eq("user_id", user.id)
		.maybeSingle();
	if (error) throw error;
	return data;
}

/**
 * Upserts the user's LLM provider and API key (encrypted) settings.
 * @param provider - LLM provider identifier
 * @param apiKey - raw API key string to encrypt & store
 */
export async function updateUserLlmSettings(
	provider: LlmSettingsRow["provider"],
	apiKey: string,
): Promise<LlmSettingsRow> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user)
		throw new Error(authError?.message ?? "Not authenticated");

	// Encrypt API key using rpc wrapper function
	const secret = process.env.DB_ENCRYPTION_SECRET;
	if (!secret) {
		throw new Error("Missing DB_ENCRYPTION_SECRET");
	}
	const { data: encrypted, error: encryptErr } = await supabase.rpc(
		"encrypt_user_llm_api_key",
		{ data: apiKey, key: secret },
	);
	if (encryptErr || typeof encrypted !== "string") {
		throw new Error("Failed to encrypt LLM API key");
	}

	const { data, error } = await supabase
		.from("user_llm_settings")
		.upsert(
			{
				user_id: user.id,
				provider,
				api_key_encrypted: encrypted,
			},
			{ onConflict: "user_id" },
		)
		.select("*")
		.single();

	if (error || !data) {
		throw new Error(error?.message ?? "Failed to update LLM settings");
	}
	return data;
}

/**
 * Creates LLM settings for the authenticated user. Fails if already exists.
 * @param provider - LLM provider identifier
 * @param apiKey - raw API key to encrypt & store
 */
export async function createUserLlmSettings(
	provider: LlmSettingsRow["provider"],
	apiKey: string,
): Promise<LlmSettingsRow> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user)
		throw new Error(authError?.message ?? "Not authenticated");

	const secret = process.env.DB_ENCRYPTION_SECRET;
	if (!secret) throw new Error("Missing DB_ENCRYPTION_SECRET");

	const { data: encrypted, error: encryptErr } = await supabase.rpc(
		"encrypt_user_llm_api_key",
		{ data: apiKey, key: secret },
	);
	if (encryptErr || typeof encrypted !== "string")
		throw new Error("Failed to encrypt LLM API key");

	const { data, error } = await supabase
		.from("user_llm_settings")
		.insert({ user_id: user.id, provider, api_key_encrypted: encrypted })
		.select("*")
		.single();

	if (error || !data)
		throw new Error(error?.message ?? "Failed to create LLM settings");
	return data;
}

/**
 * Deletes LLM settings for the authenticated user.
 */
export async function deleteUserLlmSettings(): Promise<void> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user)
		throw new Error(authError?.message ?? "Not authenticated");

	const { error } = await supabase
		.from("user_llm_settings")
		.delete()
		.eq("user_id", user.id);

	if (error) throw error;
}
