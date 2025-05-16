import { createClient } from "@/lib/supabase/server";
import { parseCosenseLines } from "@/lib/utils/cosenseParser";
import type { JSONContent } from "@tiptap/core";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

		// Unwrap dynamic params from context
		const { cosenseProjectId: projectName, title: pageTitle } = await params;

		// ユーザーと連携された Cosense プロジェクト設定取得 by projectName
		const { data: relation, error: relError } = await supabase
			.from("user_cosense_projects")
			.select("cosense_projects(project_name), scrapbox_session_cookie")
			.eq("cosense_projects.project_name", projectName)
			.single();
		if (relError || !relation) {
			console.error("[Cosense Sync Page] Project relation not found", relError);
			return NextResponse.json(
				{ error: "Cosense project not found" },
				{ status: 404 },
			);
		}

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

		// Filter out title line so it's not inserted into content
		const filteredLines = data.lines.filter(
			(line: { text: string }) => line.text.trim() !== pageTitle,
		);
		const json: JSONContent = parseCosenseLines(filteredLines);

		const { data: updatedPage, error: updateError } = await supabase
			.from("pages")
			.update({
				content_tiptap: json,
				scrapbox_page_content_synced_at: new Date().toISOString(),
			})
			.eq("user_id", user.id)
			.eq("title", pageTitle)
			.select()
			.single();

		if (updateError) {
			console.error("[Cosense Sync Page] Update failed", updateError);
			return NextResponse.json(
				{ error: "Failed to update page" },
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
