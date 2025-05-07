import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";

export const runtime = "edge";

interface RpcRow {
	type: string;
	id: string;
	suggestion: string;
}

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const q = url.searchParams.get("q")?.trim() ?? "";
	console.log("[search-suggestions] Received query:", q);
	if (!q) {
		return NextResponse.json([], {
			status: 200,
			headers: {
				"Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
			},
		});
	}

	// サーバーサイド Service Role キーでのクライアント生成
	const supabase = createAdminClient();

	// Use RPC for combined search
	const { data: rpcData, error: rpcError } = await supabase.rpc(
		"search_suggestions",
		{ p_query: q },
	);
	console.log("[search-suggestions] rpcError:", rpcError);
	console.log("[search-suggestions] rpcData:", rpcData);
	if (rpcError) {
		return NextResponse.json([], {
			status: 200,
			headers: {
				"Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
			},
		});
	}

	// Prepare rows from RPC
	const rows = (rpcData ?? []) as RpcRow[];
	// Fetch deck IDs for any card suggestions
	const cardRows = rows.filter((r) => r.type === "card");
	let deckMap = new Map<string, string>();
	if (cardRows.length > 0) {
		const { data: cardData, error: cardError } = await supabase
			.from("cards")
			.select("id, deck_id")
			.in(
				"id",
				cardRows.map((c) => c.id),
			);
		if (!cardError && cardData) {
			deckMap = new Map(cardData.map((row) => [row.id, row.deck_id]));
		}
	}
	// Build suggestions with direct hrefs
	const suggestions = rows.map((r) => {
		let href = "";
		if (r.type === "card") {
			const deckId = deckMap.get(r.id);
			href = deckId ? `/decks/${deckId}` : "/decks";
		} else if (r.type === "page") {
			href = `/pages/${encodeURIComponent(r.id)}`;
		}
		return {
			type: r.type,
			id: r.id,
			text: r.suggestion,
			href,
		};
	});

	return NextResponse.json(suggestions, {
		status: 200,
		headers: {
			"Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
		},
	});
}
