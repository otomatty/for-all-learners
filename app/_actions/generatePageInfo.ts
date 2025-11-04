"use server";

import { getPromptTemplate } from "@/app/_actions/promptService";
import type { LLMProvider } from "@/lib/llm/client";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { buildPrompt } from "@/lib/llm/prompt-builder";
import logger from "@/lib/logger";

/**
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ app/(protected)/notes/[slug]/[id]/page.tsx
 *   └─ app/api/practice/generate (検討中)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/promptService.ts
 *   ├─ lib/llm/factory.ts (createClientWithUserKey)
 *   ├─ lib/llm/prompt-builder.ts (buildPrompt)
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

	logger.info(
		{ provider, title, model: options?.model },
		"generatePageInfo: Starting generation",
	);

	// プロンプトテンプレートを取得
	const promptTemplate = await getPromptTemplate("page_info");

	// プロンプト文字列を構築
	const prompt = buildPrompt([promptTemplate, title]);

	// 動的にLLMクライアントを作成（ユーザーAPIキー自動取得）
	const client = await createClientWithUserKey({
		provider,
		model: options?.model,
	});

	logger.info(
		{ provider, model: options?.model },
		"generatePageInfo: Calling LLM",
	);

	// LLM APIを呼び出し（プロバイダー非依存）
	const markdown = await client.generate(prompt);
	// コードフェンスがある場合は中身を抽出
	const fenceMatch = markdown.match(/```(?:md|markdown)?\s*([\s\S]*?)```/i);
	let result = fenceMatch ? fenceMatch[1].trim() : markdown.trim();

	// Remove leading H1 heading if present, since title is already provided
	const lines = result.split("\n");
	if (lines[0].startsWith("# ")) {
		result = lines.slice(1).join("\n").trim();
	}

	logger.info(
		{ provider, resultLength: result.length },
		"generatePageInfo: Generation completed",
	);

	return result;
}
