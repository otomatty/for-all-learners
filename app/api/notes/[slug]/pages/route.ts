import { NextResponse } from "next/server";
import { getNotePages } from "@/app/_actions/notes";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	// Next.js 14 requires awaiting params for dynamic route handlers
	const { slug } = await params;
	const { searchParams } = new URL(req.url);
	const limit = Number(searchParams.get("limit") ?? "100");
	const offset = Number(searchParams.get("offset") ?? "0");
	const sortBy =
		(searchParams.get("sortBy") as "updated" | "created") || "updated";

	if (!slug) {
		return NextResponse.json({ error: "Missing slug" }, { status: 400 });
	}

	try {
		const { pages, totalCount } = await getNotePages({
			slug,
			limit,
			offset,
			sortBy,
		});
		return NextResponse.json({ pages, totalCount });
	} catch (err) {
		console.error("[API /notes/:slug/pages] error", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
