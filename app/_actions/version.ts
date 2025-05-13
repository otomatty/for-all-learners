"use server";

import { createClient } from "@/lib/supabase/server";
import { geminiClient } from "@/lib/gemini/client";
import { createUserContent } from "@google/genai";
import type { Database } from "@/types/database.types";

// 型定義: Gemini 応答の候補
interface GenerateReleaseNotesResponse {
	candidates?: { content: string }[];
}

/**
 * version_commit_staging テーブルにコミット情報をステージングとして登録する
 */
export async function createVersionCommitStaging(
	record: Omit<
		Database["public"]["Tables"]["version_commit_staging"]["Insert"],
		"id"
	>,
): Promise<Database["public"]["Tables"]["version_commit_staging"]["Row"]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("version_commit_staging")
		.insert(record)
		.single();
	if (error) throw error;
	return data;
}

/**
 * 指定したステージングIDのコミット情報をGeminiで要約し、ステータスを更新する
 */
export async function processVersionCommitStaging(
	id: number,
): Promise<Database["public"]["Tables"]["version_commit_staging"]["Row"]> {
	const supabase = await createClient();
	const { data: record, error: fetchError } = await supabase
		.from("version_commit_staging")
		.select("*")
		.eq("id", id)
		.single();
	if (fetchError || !record) throw fetchError ?? new Error("Record not found");

	const commits = record.commits as Array<{
		hash: string;
		author: string;
		relDate: string;
		message: string;
	}>;
	const commitListText = commits
		.map((c) => `- ${c.message} (by ${c.author} at ${c.relDate})`)
		.join("\n");
	const systemPrompt = `以下のコミット情報を基に、バージョン ${record.version} のリリースノートを日本語で作成してください。\n\nコミット一覧:\n${commitListText}`;
	const contents = createUserContent([systemPrompt]);
	const response = await geminiClient.models.generateContent({
		model: "gemini-2.5-flash-preview-04-17",
		contents,
	});
	const { candidates } = response as unknown as GenerateReleaseNotesResponse;
	let summary = candidates?.[0]?.content ?? "";
	summary = summary.replace(/```(?:json)?[\s\S]*?```/g, "").trim();

	const { data: updated, error: updateError } = await supabase
		.from("version_commit_staging")
		.update({ summary, status: "processed" })
		.eq("id", id)
		.single();
	if (updateError) throw updateError;
	return updated;
}

/**
 * 要約済みのステージングIDを確定し、version_release_notes テーブルに登録する
 */
export async function confirmVersionReleaseNotes(
	id: number,
): Promise<Database["public"]["Tables"]["version_release_notes"]["Row"]> {
	const supabase = await createClient();
	const { data: staging, error: fetchError } = await supabase
		.from("version_commit_staging")
		.select("*")
		.eq("id", id)
		.single();
	if (fetchError || !staging) throw fetchError ?? new Error("Record not found");
	if (!staging.summary) throw new Error("Summary not processed yet");

	const { data: inserted, error: insertError } = await supabase
		.from("version_release_notes")
		.insert({ version: staging.version, summary: staging.summary })
		.single();
	if (insertError) throw insertError;

	await supabase
		.from("version_commit_staging")
		.update({ status: "confirmed" })
		.eq("id", id);
	return inserted;
}
