import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await params;
		const supabase = await createClient();

		// 1. ユーザー情報取得
		const { data: account, error: accountError } = await supabase
			.from("accounts")
			.select("id, user_slug, avatar_url, full_name")
			.eq("user_slug", slug)
			.single();

		if (accountError || !account) {
			return NextResponse.json(
				{ exists: false, userSlug: slug },
				{ status: 404 },
			);
		}

		// 2. ユーザーページ取得
		const { data: page, error: pageError } = await supabase
			.from("pages")
			.select("id, thumbnail_url")
			.eq("user_id", account.id)
			.eq("title", slug)
			.single();

		// ページが存在しない場合はアバターのみ返す
		if (pageError || !page) {
			return NextResponse.json({
				exists: true,
				userSlug: slug,
				pageId: null,
				thumbnailUrl: null,
				avatarUrl: account.avatar_url,
				fullName: account.full_name,
			});
		}

		// ページが存在する場合はサムネイル優先
		return NextResponse.json({
			exists: true,
			userSlug: slug,
			pageId: page.id,
			thumbnailUrl: page.thumbnail_url,
			avatarUrl: account.avatar_url,
			fullName: account.full_name,
		});
	} catch (error) {
		console.error("User icon API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
