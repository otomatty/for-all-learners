import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { JSONContent } from "@tiptap/core";

export async function GET({
	params,
}: { params: Promise<{ cosenseProjectId: string }> }) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			console.error("[Cosense Sync List] Authentication failed", authError);
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
			console.error("[Cosense Sync List] Project relation not found", relError);
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
		const allPages: { id: string; title: string; descriptions: string[] }[] =
			[];
		let totalCount = 0;
		while (true) {
			const url = new URL(
				`https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}`,
			);
			url.searchParams.set("limit", String(limit));
			url.searchParams.set("skip", String(skip));
			const pageRes = await fetch(url.toString(), fetchOptions);
			if (!pageRes.ok) {
				console.error(
					"[Cosense Sync List] API fetch failed status",
					pageRes.status,
				);
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

		// Supabase に upsert
		const now = new Date().toISOString();
		const records = pages.map(
			(item: { id: string; title: string; descriptions: string[] }) => {
				// descriptions を TipTap JSON にマッピング
				const content: JSONContent = {
					type: "doc",
					content: item.descriptions.map((desc) => ({
						type: "paragraph",
						content: [{ type: "text", text: desc }],
					})),
				};
				return {
					user_id: user.id,
					title: item.title,
					content_tiptap: content,
					scrapbox_page_id: item.id,
					scrapbox_page_list_synced_at: now,
					scrapbox_page_content_synced_at: now,
				};
			},
		);
		const { error: upsertError } = await supabase
			.from("pages")
			.upsert(records, { onConflict: "user_id,scrapbox_page_id" });
		if (upsertError) {
			console.error("[Cosense Sync List] Upsert failed", upsertError);
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
			console.error(
				"[Cosense Sync List] Failed to update user_cosense_projects page_count:",
				relUpdateError,
			);
		}

		return NextResponse.json(
			{ syncedCount: records.length, lastSyncedAt: now },
			{ status: 200 },
		);
	} catch (err) {
		console.error("Cosense list sync error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
