import type { JSONContent } from "@tiptap/core";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCosenseDescriptions } from "@/lib/utils/cosenseParser";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ cosenseProjectId: string }> },
) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		// Unwrap dynamic params
		const { cosenseProjectId } = await params;

		// ユーザーと連携された Cosense プロジェクト設定取得
		const { data: relation, error: relError } = await supabase
			.from("user_cosense_projects")
			.select("cosense_projects(project_name), scrapbox_session_cookie")
			.eq("id", cosenseProjectId)
			.single();
		if (relError || !relation) {
			return NextResponse.json(
				{ error: "Cosense project not found" },
				{ status: 404 },
			);
		}

		const projectName = relation.cosense_projects.project_name;
		// プライベートプロジェクト対応: セッションクッキーを取得
		const { scrapbox_session_cookie } = relation as {
			scrapbox_session_cookie?: string;
		};
		let cookieHeader = "";
		if (scrapbox_session_cookie) {
			cookieHeader = scrapbox_session_cookie.includes("=")
				? scrapbox_session_cookie
				: `connect.sid=${scrapbox_session_cookie}`;
		}
		const fetchOptions: RequestInit = cookieHeader
			? { headers: { cookie: cookieHeader } }
			: {};

		// Paginate through Scrapbox pages with limit and skip
		const limit = 1000;
		let skip = 0;
		const allPages: {
			id: string;
			title: string;
			image: string | null;
			descriptions: string[];
			created: number;
			updated: number;
		}[] = [];
		let totalCount = 0;
		while (true) {
			const url = new URL(
				`https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}`,
			);
			url.searchParams.set("limit", String(limit));
			url.searchParams.set("skip", String(skip));
			const pageRes = await fetch(url.toString(), fetchOptions);
			if (!pageRes.ok) {
				return NextResponse.json(
					{ error: "Failed to fetch from Cosense" },
					{ status: 502 },
				);
			}
			const pageData = await pageRes.json();

			if (skip === 0) totalCount = pageData.count;
			const batch = pageData.pages ?? [];
			allPages.push(...batch);
			if (batch.length < limit || allPages.length >= totalCount) {
				break;
			}
			skip += limit;
		}
		const pages = allPages;

		// Sync filtering: include pages with updated content or missing thumbnails
		const scrapboxIds = pages.map((p) => p.id);
		// Fetch existing updated_at and thumbnail_url via RPC
		// RPC get_pages_by_ids returns scrapbox_page_id, updated_at, thumbnail_url
		// SQL:
		// BEGIN
		//   RETURN QUERY
		//   SELECT p.scrapbox_page_id, p.updated_at, p.thumbnail_url
		//     FROM pages p
		//    WHERE p.user_id = uid
		//      AND p.scrapbox_page_id = ANY(ids);
		// END;
		const { data: existingPages, error: existingPagesError } =
			await supabase.rpc("get_pages_by_ids", {
				ids: scrapboxIds,
				uid: user.id,
			});
		if (existingPagesError) {
		}
		// Build map of existing metadata for comparison
		const existingMap = new Map(
			(existingPages ?? []).map(
				(e) =>
					[
						e.scrapbox_page_id,
						{ updated_at: e.updated_at, thumbnail_url: e.thumbnail_url },
					] as [string, { updated_at: string; thumbnail_url: string | null }],
			),
		);
		// Fetch existing content sync timestamps to preserve detailed sync status
		const { data: contentSyncPages, error: contentSyncError } = await supabase
			.from("pages")
			.select("scrapbox_page_id, scrapbox_page_content_synced_at")
			.eq("user_id", user.id)
			.in("scrapbox_page_id", scrapboxIds);
		if (contentSyncError) {
		}
		const contentSyncMap = new Map(
			(contentSyncPages ?? []).map(
				(e) =>
					[e.scrapbox_page_id, e.scrapbox_page_content_synced_at] as [
						string,
						string | null,
					],
			),
		);
		// Filter pages: include if newer OR if existing record lacks thumbnail
		const filteredPages = pages.filter((item) => {
			const incomingMs = item.updated * 1000;
			const existing = existingMap.get(item.id);
			const existingMs = existing?.updated_at
				? new Date(existing.updated_at).getTime()
				: 0;
			const hasThumb = existing?.thumbnail_url != null;
			return incomingMs > existingMs || !hasThumb;
		});
		const skippedCount = pages.length - filteredPages.length;

		// Supabase に upsert (filtered)
		const now = new Date().toISOString();
		const records = filteredPages.map(
			(item: {
				id: string;
				title: string;
				image: string | null;
				descriptions: string[];
				created: number;
				updated: number;
			}) => {
				// Scrapbox API のタイムスタンプ（秒）を ISO 文字列に変換
				const createdAt = new Date(item.created * 1000).toISOString();
				const updatedAt = new Date(item.updated * 1000).toISOString();
				// descriptions を TipTap JSON にマッピング
				const content: JSONContent = parseCosenseDescriptions(
					item.descriptions,
				);
				// Preserve previous detailed content sync timestamp
				const prevContentSynced = contentSyncMap.get(item.id) ?? null;
				return {
					user_id: user.id,
					title: item.title,
					thumbnail_url: item.image,
					content_tiptap: content,
					scrapbox_page_id: item.id,
					scrapbox_page_list_synced_at: now,
					scrapbox_page_content_synced_at: prevContentSynced,
					created_at: createdAt,
					updated_at: updatedAt,
				};
			},
		);
		const { error: upsertError } = await supabase
			.from("pages")
			.upsert(records, { onConflict: "user_id,scrapbox_page_id" });
		if (upsertError) {
			return NextResponse.json(
				{ error: "Failed to save pages" },
				{ status: 500 },
			);
		}

		// user_cosense_projects の page_count を更新
		const { error: relUpdateError } = await supabase
			.from("user_cosense_projects")
			.update({ page_count: totalCount, updated_at: now })
			.eq("id", cosenseProjectId);
		if (relUpdateError) {
		}

		return NextResponse.json(
			{
				totalCount,
				syncedCount: records.length,
				lastSyncedAt: now,
				skippedCount,
			},
			{ status: 200 },
		);
	} catch (_err) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
