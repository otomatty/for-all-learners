"use server";

import {
	DEFAULT_PAGE_INFO_PROMPT,
	DEFAULT_WIKI_PROMPT,
} from "@/lib/promptDefaults";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * 指定キーのプロンプトテンプレートを取得します。
 */
export async function getUserPromptTemplate(
	promptKey: string,
): Promise<Database["public"]["Tables"]["user_page_prompts"]["Row"] | null> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const { data, error } = await supabase
		.from("user_page_prompts")
		.select("*")
		.eq("user_id", user.id)
		.eq("prompt_key", promptKey)
		.maybeSingle();
	if (error) throw error;
	return data;
}

/**
 * プロンプトテンプレートを作成または更新します。
 */
export async function updateUserPromptTemplate(
	promptKey: string,
	template: string,
): Promise<Database["public"]["Tables"]["user_page_prompts"]["Row"]> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const { data, error } = await supabase
		.from("user_page_prompts")
		.upsert(
			{ user_id: user.id, prompt_key: promptKey, template },
			{ onConflict: "user_id, prompt_key" },
		)
		.select("*")
		.single();
	if (error || !data) {
		throw new Error(error?.message ?? "Failed to update prompt template");
	}
	return data;
}

/**
 * ユーザー登録時にデフォルトプロンプトテンプレートを初期挿入します。
 */
export async function initializeUserPromptTemplates(): Promise<void> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const defaultTemplates = [
		{ prompt_key: "page_wiki" as const, template: DEFAULT_WIKI_PROMPT },
		{ prompt_key: "page_info" as const, template: DEFAULT_PAGE_INFO_PROMPT },
	];
	const { error } = await supabase.from("user_page_prompts").upsert(
		defaultTemplates.map((t) => ({ ...t, user_id: user.id })),
		{ onConflict: "user_id, prompt_key" },
	);
	if (error) {
		throw new Error(error.message);
	}
}

/**
 * ユーザーの全プロンプトテンプレートを取得します。
 */
export async function getAllUserPromptTemplates(): Promise<
	Database["public"]["Tables"]["user_page_prompts"]["Row"][]
> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const { data, error } = await supabase
		.from("user_page_prompts")
		.select("*")
		.eq("user_id", user.id);
	if (error) throw error;
	return data || [];
}
