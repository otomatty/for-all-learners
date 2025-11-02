"use server";

import { createUserContent } from "@google/genai";
import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
import { getPromptTemplate } from "@/app/_actions/promptService";
import { geminiClient } from "@/lib/gemini/client";
import type { LLMProvider } from "@/lib/llm/client";
import logger from "@/lib/logger";

/**
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ app/(protected)/notes/[slug]/[id]/page.tsx
 *   └─ app/api/practice/generate (検討中)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/ai/getUserAPIKey.ts
 *   ├─ app/_actions/promptService.ts
 *   ├─ lib/gemini/client.ts
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./generatePageInfo.spec.md
 *   ├─ Tests: ./__tests__/generatePageInfo.test.ts
 *   └─ Plan: docs/03_plans/mastra-infrastructure/20251102_04_phase10-integration-plan.md
 */

interface GeneratePageInfoOptions {
	provider?: LLMProvider;
	model?: string;
}

/**
 * サーバーアクション: ページタイトルを基にMarkdown形式の解説ドキュメントを生成
 *
 * @param title - ページのタイトル（キーワード）
 * @param options - 生成オプション
 * @param options.provider - LLMプロバイダー ("google" | "openai" | "anthropic", デフォルト: "google")
 * @param options.model - カスタムモデル名（オプション）
 * @returns Markdown文字列
 * @throws Error if title is empty
 * @throws Error if API key is not configured
 *
 * @example
 * ```typescript
 * // Google Geminiでコンテンツ生成
 * const markdown = await generatePageInfo("React Hooks");
 *
 * // OpenAIでコンテンツ生成
 * const markdown = await generatePageInfo("React Hooks", { provider: "openai" });
 * ```
 */
export async function generatePageInfo(
	title: string,
	options?: GeneratePageInfoOptions,
): Promise<string> {
	// バリデーション
	if (!title.trim()) {
		throw new Error("タイトルが空です");
	}

	const provider = (options?.provider || "google") as LLMProvider;

	// ユーザーAPIキー取得
	logger.info({ provider, title }, "generatePageInfo: Getting API key");
	const apiKey = await getUserAPIKey(provider);
	logger.info(
		{ provider, hasApiKey: !!apiKey },
		"generatePageInfo: API key retrieved",
	);

	// プロンプトテンプレートを取得
	const promptTemplate = await getPromptTemplate("page_info");
	// モデルへのプロンプトとタイトルを設定
	const contents = createUserContent([promptTemplate, title]);

	// Gemini APIを呼び出し（現在はGemini固定、将来的に他のLLM対応）
	logger.info(
		{ provider, model: options?.model || "gemini-2.5-flash" },
		"generatePageInfo: Calling LLM",
	);
	const response = await geminiClient.models.generateContent({
		model: options?.model || "gemini-2.5-flash",
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
		logger.error({ provider }, "generatePageInfo: No content in response");
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
