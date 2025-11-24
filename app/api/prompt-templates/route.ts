/**
 * Prompt Templates API Route
 *
 * API for managing user prompt templates
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ app/(protected)/settings/_components/prompt-templates/index.tsx
 *
 * Types:
 *   └─ types/prompt-templates.ts (PromptRow)
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ types/database.types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/prompt-templates - Get all user prompt templates
 */
export async function GET(_request: NextRequest) {
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

		const { data, error } = await supabase
			.from("user_page_prompts")
			.select("prompt_key, template")
			.eq("user_id", user.id);

		if (error) {
			logger.error({ error }, "Failed to fetch prompt templates");
			return NextResponse.json(
				{
					error: "Database error",
					message: `プロンプトテンプレートの取得に失敗しました: ${error.message}`,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(data || []);
	} catch (error: unknown) {
		logger.error({ error }, "Failed to get prompt templates");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "プロンプトテンプレートの取得中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * PUT /api/prompt-templates - Update user prompt template
 */
export async function PUT(request: NextRequest) {
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
			prompt_key: string;
			template: string;
		};

		if (!body.prompt_key || !body.template) {
			return NextResponse.json(
				{ error: "Bad request", message: "prompt_keyとtemplateは必須です" },
				{ status: 400 },
			);
		}

		// Upsert prompt template
		const { data, error } = await supabase
			.from("user_page_prompts")
			.upsert(
				{
					user_id: user.id,
					prompt_key: body.prompt_key,
					template: body.template,
				},
				{
					onConflict: "user_id,prompt_key",
				},
			)
			.select()
			.single();

		if (error) {
			logger.error({ error }, "Failed to update prompt template");
			return NextResponse.json(
				{
					error: "Database error",
					message: `プロンプトテンプレートの更新に失敗しました: ${error.message}`,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(data);
	} catch (error: unknown) {
		logger.error({ error }, "Failed to update prompt template");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "プロンプトテンプレートの更新中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
