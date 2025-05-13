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
 * リリースノートJSONの型定義
 */
interface ReleaseNotesJSON {
	version: string;
	title: string;
	published_at: string; // YYYY-MM-DD
	items: {
		type: "new" | "improvement" | "fix" | "security";
		description: string;
		display_order: number;
	}[];
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
		.select("*")
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
	// JSON形式出力用プロンプトに変更
	const systemPrompt = `
以下のコミット情報を基に、バージョン ${record.version} のリリースノートを日本語で作成し、必ず以下のJSON形式で出力してください。JSON以外のテキストは出力しないでください。
タイトル（title）はコミット内容を要約した短い説明を入れてください。published_atにはリリース日（YYYY-MM-DD）を設定してください。

{
  "version": "${record.version}",
  "title": "",
  "published_at": "${record.version}",
  "items": [
    { "type": "new", "description": "〜を追加", "display_order": 0 },
    { "type": "fix", "description": "〜を修正", "display_order": 1 }
  ]
}

コミット一覧:
${commitListText}`;
	const contents = createUserContent([systemPrompt]);
	const response = await geminiClient.models.generateContent({
		model: "gemini-2.5-flash-preview-04-17",
		contents,
	});
	const { candidates } = response as unknown as GenerateReleaseNotesResponse;
	// AIレスポンスを文字列化
	const rawContent = candidates?.[0]?.content;
	let jsonString: string;
	if (typeof rawContent === "string") {
		jsonString = rawContent;
	} else if (rawContent != null) {
		jsonString = JSON.stringify(rawContent);
	} else {
		throw new Error("No content returned from AI");
	}
	// JSONパース
	let parsed: ReleaseNotesJSON;
	try {
		parsed = JSON.parse(jsonString) as ReleaseNotesJSON;
	} catch (e) {
		throw new Error(`Failed to parse release notes JSON: ${e}`);
	}
	// DBに要約JSON文字列とステータスを更新して保存
	const { data: updated, error: updateError } = await supabase
		.from("version_commit_staging")
		.update({ summary: jsonString, status: "processed" })
		.eq("id", id)
		.select("*")
		.single();
	if (updateError) throw updateError;
	if (!updated)
		throw new Error("Failed to update version_commit_staging record");
	return updated;
}

/**
 * 要約済みのステージングIDを確定し、version_release_notes テーブルに登録する
 */
export async function confirmVersionReleaseNotes(
	id: number,
): Promise<Database["public"]["Tables"]["changelog_entries"]["Row"]> {
	const supabase = await createClient();
	const { data: staging, error: fetchError } = await supabase
		.from("version_commit_staging")
		.select("*")
		.eq("id", id)
		.single();
	if (fetchError || !staging) throw fetchError ?? new Error("Record not found");
	if (!staging.summary) throw new Error("Summary not processed yet");
	// staging.summary(JSON)をパース
	let parsedRelease: ReleaseNotesJSON;
	try {
		parsedRelease = JSON.parse(staging.summary) as ReleaseNotesJSON;
	} catch (e) {
		throw new Error(`Failed to parse staging.summary JSON: ${e}`);
	}
	// changelog_entriesへ挿入
	const { data: entry, error: entryError } = await supabase
		.from("changelog_entries")
		.insert({
			version: staging.version,
			title: parsedRelease.title,
			published_at: parsedRelease.published_at,
		})
		.select("*")
		.single();
	if (entryError || !entry)
		throw entryError ?? new Error("Failed to insert changelog_entries");
	// changelog_itemsへ一括挿入
	const itemsToInsert = parsedRelease.items.map((item) => ({
		entry_id: entry.id,
		type: item.type,
		description: item.description,
		display_order: item.display_order,
	}));
	const { error: itemsError } = await supabase
		.from("changelog_items")
		.insert(itemsToInsert);
	if (itemsError) throw itemsError;
	// ステータスを確定
	await supabase
		.from("version_commit_staging")
		.update({ status: "confirmed" })
		.eq("id", id);
	return entry;
}

/**
 * バージョンごとのステージングレコードを取得する
 */
export async function getVersionCommitStagingByVersion(
	version: string,
): Promise<
	Database["public"]["Tables"]["version_commit_staging"]["Row"] | null
> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("version_commit_staging")
		.select("*")
		.eq("version", version)
		.order("id", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	return data;
}
