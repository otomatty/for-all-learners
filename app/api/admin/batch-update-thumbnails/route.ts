/**
 * Batch Update Thumbnails API Route
 *
 * Admin-only API for batch updating page thumbnails
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ app/admin/_components/ThumbnailBatchUpdate.tsx
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   ├─ lib/utils/thumbnailExtractor.ts (extractFirstImageUrl)
 *   └─ types/database.types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import type { JSONContent } from "@tiptap/core";
import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { extractFirstImageUrl } from "@/lib/utils/thumbnailExtractor";

export interface BatchUpdateResult {
	totalProcessed: number;
	successCount: number;
	errorCount: number;
	processingTimeMs: number;
	details: Array<{
		pageId: string;
		title: string;
		success: boolean;
		thumbnailUrl?: string;
		error?: string;
	}>;
}

/**
 * Check if user is admin
 */
async function checkAdminAccess(): Promise<{
	isAdmin: boolean;
	userId?: string;
}> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { isAdmin: false };
	}

	const { data: adminCheck } = await supabase
		.from("admin_users")
		.select("id")
		.eq("user_id", user.id)
		.eq("is_active", true)
		.single();

	return {
		isAdmin: !!adminCheck,
		userId: user.id,
	};
}

/**
 * POST /api/admin/batch-update-thumbnails - Batch update thumbnails
 */
export async function POST(request: NextRequest) {
	const startTime = Date.now();

	try {
		// Check admin access
		const adminCheck = await checkAdminAccess();
		if (!adminCheck.isAdmin) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "管理者権限が必要です" },
				{ status: 403 },
			);
		}

		const supabase = await createClient();
		const body = (await request.json()) as {
			userId?: string;
			dryRun?: boolean;
			batchLimit?: number;
		};

		const userId = body.userId;
		const dryRun = body.dryRun ?? true;
		const batchLimit = body.batchLimit ?? 100;

		// Build query for pages without thumbnails
		let pagesQuery = supabase
			.from("pages")
			.select("id, title, content_tiptap, thumbnail_url")
			.is("thumbnail_url", null)
			.limit(batchLimit);

		if (userId) {
			pagesQuery = pagesQuery.eq("user_id", userId);
		}

		const { data: pages, error } = await pagesQuery;

		if (error) {
			logger.error({ error }, "Failed to fetch pages for batch update");
			return NextResponse.json(
				{
					error: "Database error",
					message: `ページの取得に失敗しました: ${error.message}`,
				},
				{ status: 500 },
			);
		}

		const result: BatchUpdateResult = {
			totalProcessed: pages?.length ?? 0,
			successCount: 0,
			errorCount: 0,
			processingTimeMs: 0,
			details: [],
		};

		// Process each page
		for (const page of pages || []) {
			try {
				if (!page.content_tiptap) {
					result.details.push({
						pageId: page.id,
						title: page.title,
						success: false,
						error: "コンテンツがありません",
					});
					result.errorCount++;
					continue;
				}

				const content = page.content_tiptap as JSONContent;
				const thumbnailUrl = extractFirstImageUrl(content);

				if (!thumbnailUrl) {
					result.details.push({
						pageId: page.id,
						title: page.title,
						success: false,
						error: "画像が見つかりませんでした",
					});
					result.errorCount++;
					continue;
				}

				if (!dryRun) {
					// Update thumbnail
					const { error: updateError } = await supabase
						.from("pages")
						.update({ thumbnail_url: thumbnailUrl })
						.eq("id", page.id);

					if (updateError) {
						result.details.push({
							pageId: page.id,
							title: page.title,
							success: false,
							error: updateError.message,
						});
						result.errorCount++;
						continue;
					}
				}

				result.details.push({
					pageId: page.id,
					title: page.title,
					success: true,
					thumbnailUrl,
				});
				result.successCount++;
			} catch (error: unknown) {
				result.details.push({
					pageId: page.id,
					title: page.title,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				result.errorCount++;
			}
		}

		result.processingTimeMs = Date.now() - startTime;

		logger.info(
			{
				totalProcessed: result.totalProcessed,
				successCount: result.successCount,
				errorCount: result.errorCount,
				dryRun,
			},
			"Batch thumbnail update completed",
		);

		return NextResponse.json(result);
	} catch (error: unknown) {
		logger.error({ error }, "Failed to batch update thumbnails");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "バッチ更新中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
