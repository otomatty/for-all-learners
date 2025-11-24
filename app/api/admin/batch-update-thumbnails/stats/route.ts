/**
 * Batch Update Thumbnails Stats API Route
 *
 * GET endpoint for thumbnail statistics
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

export interface ThumbnailStats {
	totalPages: number;
	withThumbnail: number;
	withoutThumbnail: number;
	withImages: number;
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
 * GET /api/admin/batch-update-thumbnails/stats - Get thumbnail statistics
 */
export async function GET(request: NextRequest) {
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
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		// Build query for pages
		let pagesQuery = supabase
			.from("pages")
			.select("id, thumbnail_url, content_tiptap");

		if (userId) {
			pagesQuery = pagesQuery.eq("user_id", userId);
		}

		const { data: pages, error } = await pagesQuery;

		if (error) {
			logger.error({ error }, "Failed to fetch pages for thumbnail stats");
			return NextResponse.json(
				{
					error: "Database error",
					message: `ページの取得に失敗しました: ${error.message}`,
				},
				{ status: 500 },
			);
		}

		const totalPages = pages?.length ?? 0;
		const withThumbnail = (pages || []).filter((p) => p.thumbnail_url).length;
		const withoutThumbnail = totalPages - withThumbnail;

		// Count pages with images in content
		let withImages = 0;
		for (const page of pages || []) {
			if (page.content_tiptap) {
				const content = page.content_tiptap as JSONContent;
				const imageUrl = extractFirstImageUrl(content);
				if (imageUrl) {
					withImages++;
				}
			}
		}

		const stats: ThumbnailStats = {
			totalPages,
			withThumbnail,
			withoutThumbnail,
			withImages,
		};

		return NextResponse.json(stats);
	} catch (error: unknown) {
		logger.error({ error }, "Failed to get thumbnail stats");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "統計情報の取得中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
