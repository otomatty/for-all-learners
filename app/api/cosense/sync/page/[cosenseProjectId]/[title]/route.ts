import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { JSONContent } from "@tiptap/core";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ cosenseProjectId: string; title: string }> },
) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			console.error("[Cosense Sync Page] Authentication failed", authError);
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		// Unwrap dynamic params
		const { cosenseProjectId, title: pageTitle } = await params;

		// ユーザーと連携された Cosense プロジェクト設定取得
		const { data: relation, error: relError } = await supabase
			.from("user_cosense_projects")
			.select("cosense_projects(project_name), scrapbox_session_cookie")
			.eq("id", cosenseProjectId)
			.single();
		if (relError || !relation) {
			console.error("[Cosense Sync Page] Project relation not found", relError);
			return NextResponse.json(
				{ error: "Cosense project not found" },
				{ status: 404 },
			);
		}

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

		const apiUrl = `https://scrapbox.io/api/pages/${encodeURIComponent(
			projectName,
		)}/${encodeURIComponent(pageTitle)}`;
		const res = await fetch(apiUrl, fetchOptions);
		if (!res.ok) {
			console.error("[Cosense Sync Page] API fetch failed status", res.status);
			return NextResponse.json(
				{ error: "Failed to fetch page from Cosense" },
				{ status: 502 },
			);
		}
		const data = await res.json();

		// Scrapbox の lines を TipTap JSON にマッピング
		const content = data.lines.map((item: { text: string }) => ({
			type: "paragraph",
			content: [{ type: "text", text: item.text }],
		}));
		const json: JSONContent = { type: "doc", content };

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
		if (upsertError) {
			console.error("[Cosense Sync Page] Upsert failed", upsertError);
			return NextResponse.json(
				{ error: "Failed to save page" },
				{ status: 500 },
			);
		}

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
