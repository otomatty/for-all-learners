"use server";

import { geminiClient } from "@/lib/gemini/client";
import { createUserContent } from "@google/genai";
import type { JSONContent } from "@tiptap/core";

/**
 * サーバーアクション: ページタイトルを基にMarkdown形式の解説ドキュメントを生成
 * @param title - ページのタイトル（キーワード）
 * @returns Markdown文字列
 */
export async function generatePageInfo(title: string): Promise<string> {
	if (!title.trim()) {
		throw new Error("タイトルが空です");
	}

	// モデルへのシステムプロンプトとタイトルを設定: Markdown形式で出力
	const systemPrompt =
		"以下のキーワードに基づいて、Wikipediaのような詳細な解説ドキュメントをMarkdown形式で出力してください。Markdownのみを返してください。";
	const contents = createUserContent([systemPrompt, title]);

	// Gemini APIを呼び出し
	const response = await geminiClient.models.generateContent({
		model: "gemini-2.5-flash-preview-04-17",
		contents,
	});

	// レスポンス候補の抽出
	/**
	 * Geminiからのレスポンス候補型
	 */
	interface GeminiCandidate {
		content?: string | { parts: { text: string }[] };
	}
	const { candidates } = response as unknown as {
		candidates?: GeminiCandidate[];
	};
	const candidate = candidates?.[0];
	if (!candidate || !candidate.content) {
		throw new Error("コンテンツ生成に失敗しました");
	}

	// Markdown文字列として結合
	let markdown: string;
	if (typeof candidate.content === "string") {
		markdown = candidate.content;
	} else {
		markdown = candidate.content.parts.map((p) => p.text).join("");
	}
	// コードフェンスがある場合は中身を抽出
	const fenceMatch = markdown.match(/```(?:md|markdown)?\s*([\s\S]*?)```/i);
	let result = fenceMatch ? fenceMatch[1].trim() : markdown.trim();
	// Remove leading H1 heading if present, since title is already provided
	const lines = result.split("\n");
	if (lines[0].startsWith("# ")) {
		result = lines.slice(1).join("\n").trim();
	}

	return result;
}
