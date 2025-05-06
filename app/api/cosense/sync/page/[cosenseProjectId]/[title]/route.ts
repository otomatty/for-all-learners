import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { JSONContent } from "@tiptap/core";

export async function GET(
	req: NextRequest,
	{ params }: { params: { cosenseProjectId: string; title: string } },
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

		// ユーザーと連携された Cosense プロジェクト設定取得
		const { data: relation, error: relError } = await supabase
			.from("user_cosense_projects")
			.select("cosense_projects(project_name)")
			.eq("id", params.cosenseProjectId)
			.single();
		if (relError || !relation) {
			return NextResponse.json(
				{ error: "Cosense project not found" },
				{ status: 404 },
			);
		}
		const projectName = relation.cosense_projects.project_name;
		const pageTitle = params.title;

		// Cosense API から個別ページ情報を取得
		const res = await fetch(
			`https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}/${encodeURIComponent(pageTitle)}`,
		);
		if (!res.ok) {
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

		// Supabase に upsert
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
		console.error("Cosense page sync error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
