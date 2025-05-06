import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { JSONContent } from "@tiptap/core";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ cosenseProjectId: string; title: string }> },
) {
	console.log("[Cosense Sync Page] Entry point");
	try {
		console.log("[Cosense Sync Page] Authenticating user...");
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		console.log(
			"[Cosense Sync Page] Auth result, user:",
			user,
			"authError:",
			authError,
		);
		if (authError || !user) {
			console.error("[Cosense Sync Page] Authentication failed", authError);
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		// Unwrap dynamic params
		console.log("[Cosense Sync Page] Awaiting params...");
		const { cosenseProjectId, title: pageTitle } = await params;
		console.log(
			"[Cosense Sync Page] cosenseProjectId =",
			cosenseProjectId,
			"pageTitle =",
			pageTitle,
		);

		// ユーザーと連携された Cosense プロジェクト設定取得
		const { data: relation, error: relError } = await supabase
			.from("user_cosense_projects")
			.select("cosense_projects(project_name), scrapbox_session_cookie")
			.eq("id", cosenseProjectId)
			.single();
		console.log("[Cosense Sync Page] relation, relError", relation, relError);
		if (relError || !relation) {
			console.error("[Cosense Sync Page] Project relation not found", relError);
			return NextResponse.json(
				{ error: "Cosense project not found" },
				{ status: 404 },
			);
		}
		console.log(
			"[Cosense Sync Page] projectName =",
			relation.cosense_projects.project_name,
		);
		const projectName = relation.cosense_projects.project_name;

		// prepare cookie header if private project
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

		// Cosense API から個別ページ情報を取得
		console.log(
			"[Cosense Sync Page] Fetching page from API",
			projectName,
			pageTitle,
		);
		const apiUrl = `https://scrapbox.io/api/pages/${encodeURIComponent(
			projectName,
		)}/${encodeURIComponent(pageTitle)}`;
		const res = await fetch(apiUrl, fetchOptions);
		console.log("[Cosense Sync Page] API status =", res.status);
		if (!res.ok) {
			console.error("[Cosense Sync Page] API fetch failed status", res.status);
			return NextResponse.json(
				{ error: "Failed to fetch page from Cosense" },
				{ status: 502 },
			);
		}
		const data = await res.json();
		console.log(
			"[Cosense Sync Page] API data lines count =",
			data.lines?.length,
		);

		// Scrapbox の lines を TipTap JSON にマッピング
		console.log("[Cosense Sync Page] Mapping lines to JSON...");
		const content = data.lines.map((item: { text: string }) => ({
			type: "paragraph",
			content: [{ type: "text", text: item.text }],
		}));
		const json: JSONContent = { type: "doc", content };

		// Supabase に upsert
		console.log("[Cosense Sync Page] Upserting page...");
		const { error: upsertError } = await supabase.from("pages").upsert(
			{
				user_id: user.id,
				title: pageTitle,
				content_tiptap: json,
				scrapbox_page_id: pageTitle,
				scrapbox_page_content_synced_at: new Date().toISOString(),
			},
			{ onConflict: "user_id,scrapbox_page_id" },
		);
		console.log("[Cosense Sync Page] upsertError =", upsertError);
		if (upsertError) {
			console.error("[Cosense Sync Page] Upsert failed", upsertError);
			return NextResponse.json(
				{ error: "Failed to save page" },
				{ status: 500 },
			);
		}

		console.log(
			"[Cosense Sync Page] Returning success syncedAt",
			new Date().toISOString(),
		);
		return NextResponse.json(
			{ syncedAt: new Date().toISOString() },
			{ status: 200 },
		);
	} catch (err) {
		console.error("[Cosense Sync Page] Error caught:", err);
		console.error("Cosense page sync error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
