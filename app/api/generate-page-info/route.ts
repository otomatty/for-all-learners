/**
 * Generate Page Info API Route
 *
 * API for generating page information using LLM
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ app/(protected)/settings/_components/prompt-templates/index.tsx
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/llm/factory.ts (createClientWithUserKey)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClientWithUserKey } from "@/lib/llm/factory";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/generate-page-info - Generate page information using LLM
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "認証が必要です" },
				{ status: 401 },
			);
		}

		const body = (await request.json()) as {
			title: string;
			prompt?: string;
		};

		if (!body.title) {
			return NextResponse.json(
				{ error: "Bad request", message: "titleは必須です" },
				{ status: 400 },
			);
		}

		// Get user prompt template or use default
		let prompt = body.prompt;
		if (!prompt) {
			const { data: template } = await supabase
				.from("user_page_prompts")
				.select("template")
				.eq("user_id", user.id)
				.eq("prompt_key", "generate_page_info")
				.single();

			prompt = template?.template || "{{title}}について説明してください。";
		}

		// Replace {{title}} placeholder
		const finalPrompt = prompt.replace(/{{\s*title\s*}}/g, body.title);

		// Generate using LLM
		const llmClient = await createClientWithUserKey({ provider: "google" });
		const result = await llmClient.generate(finalPrompt);

		return NextResponse.json(result);
	} catch (error: unknown) {
		logger.error({ error }, "Failed to generate page info");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "ページ情報の生成中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
