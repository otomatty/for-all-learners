import { getPagesByUser } from "@/app/_actions/pages";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const userId = searchParams.get("userId");
	const limit = Number(searchParams.get("limit") ?? "100");
	const offset = Number(searchParams.get("offset") ?? "0");
	const sortBy =
		(searchParams.get("sortBy") as "updated" | "created") || "updated";

	if (!userId) {
		return NextResponse.json({ error: "Missing userId" }, { status: 400 });
	}

	try {
		const { pages, totalCount } = await getPagesByUser(
			userId,
			limit,
			offset,
			sortBy,
		);
		return NextResponse.json({ pages, totalCount });
	} catch (err) {
		console.error("[API /pages] error", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
