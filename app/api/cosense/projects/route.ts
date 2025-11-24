/**
 * Cosense Projects API Route
 *
 * API for managing user Cosense projects
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ app/(protected)/settings/_components/external-sync-settings/cosense-sync-settings.tsx
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

export interface CosenseProject {
	id: string;
	project_name: string;
	lastSyncedAt: string;
	page_count: number;
	accessible: boolean;
}

/**
 * POST /api/cosense/projects - Add user Cosense project
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
			projectName: string;
			scrapboxCookie?: string;
		};

		if (!body.projectName) {
			return NextResponse.json(
				{ error: "Bad request", message: "projectNameは必須です" },
				{ status: 400 },
			);
		}

		// First, upsert cosense_projects table
		const { data: cosenseProject, error: cosenseError } = await supabase
			.from("cosense_projects")
			.upsert(
				{ project_name: body.projectName },
				{ onConflict: "project_name" },
			)
			.select()
			.single();

		if (cosenseError) {
			logger.error({ error: cosenseError }, "Failed to upsert cosense project");
			return NextResponse.json(
				{
					error: "Database error",
					message: `プロジェクトの作成に失敗しました: ${cosenseError.message}`,
				},
				{ status: 500 },
			);
		}

		// Then, insert user_cosense_projects link
		const { data, error } = await supabase
			.from("user_cosense_projects")
			.insert({
				user_id: user.id,
				cosense_project_id: cosenseProject.id,
				scrapbox_session_cookie: body.scrapboxCookie || null,
			})
			.select()
			.single();

		if (error) {
			logger.error({ error }, "Failed to add Cosense project");
			return NextResponse.json(
				{
					error: "Database error",
					message: `プロジェクトの追加に失敗しました: ${error.message}`,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(data);
	} catch (error: unknown) {
		logger.error({ error }, "Failed to add Cosense project");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "プロジェクトの追加中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/cosense/projects - Remove user Cosense project
 */
export async function DELETE(request: NextRequest) {
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

		const { searchParams } = new URL(request.url);
		const projectId = searchParams.get("projectId");

		if (!projectId) {
			return NextResponse.json(
				{ error: "Bad request", message: "projectIdは必須です" },
				{ status: 400 },
			);
		}

		// Delete project
		const { error } = await supabase
			.from("user_cosense_projects")
			.delete()
			.eq("id", projectId)
			.eq("user_id", user.id);

		if (error) {
			logger.error({ error }, "Failed to remove Cosense project");
			return NextResponse.json(
				{
					error: "Database error",
					message: `プロジェクトの削除に失敗しました: ${error.message}`,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		logger.error({ error }, "Failed to remove Cosense project");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "プロジェクトの削除中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
