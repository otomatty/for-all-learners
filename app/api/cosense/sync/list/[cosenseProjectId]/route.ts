import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export async function GET(
	req: NextRequest,
	{ params }: { params: { cosenseProjectId: string } },
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

		// Cosense API からページ一覧を取得
		const res = await fetch(
			`https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}`,
		);
		if (!res.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch from Cosense" },
				{ status: 502 },
			);
		}
		const data = await res.json();
		const pages = data.pages ?? [];

		// Supabase に upsert
		const records = pages.map((item: { title: string }) => ({
			user_id: user.id,
			title: item.title,
			scrapbox_page_id: item.title,
			scrapbox_page_list_synced_at: new Date().toISOString(),
		}));
		const { error: upsertError } = await supabase
			.from("pages")
			.upsert(records, { onConflict: "user_id,scrapbox_page_id" });
		if (upsertError) {
			return NextResponse.json(
				{ error: "Failed to save pages" },
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{ syncedCount: records.length, lastSyncedAt: new Date().toISOString() },
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
