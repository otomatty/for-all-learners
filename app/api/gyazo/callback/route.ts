import { NextResponse } from "next/server";
import { handleGyazoCallback } from "@/app/_actions/gyazo";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const code = searchParams.get("code");
	if (!code) {
		return NextResponse.json(
			{ error: "Missing code parameter" },
			{ status: 400 },
		);
	}

	try {
		await handleGyazoCallback(code);
		// 認証後、設定ページへリダイレクト
		return NextResponse.redirect(new URL("/settings", req.url));
	} catch (_error) {
		// エラー時も設定ページにリダイレクト（クエリで状態を示せる）
		return NextResponse.redirect(new URL("/settings?error=gyazo", req.url));
	}
}
