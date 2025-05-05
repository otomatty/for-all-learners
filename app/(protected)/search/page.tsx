import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/adminClient";

/**
 * 検索結果項目の型定義
 */
interface SuggestionRow {
	/** 候補の種別 */
	type: "card" | "page";
	/** 元レコードのID (UUID) */
	id: string;
	/** 表示テキスト */
	suggestion: string;
}

/**
 * 検索ページコンポーネント
 * @param searchParams.q 検索クエリ
 */
export default async function SearchPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string }>;
}) {
	const { q } = await searchParams;
	const query = q?.trim() ?? "";
	if (!query) {
		return <div className="p-4">キーワードを入力してください。</div>;
	}

	const supabase = createAdminClient();
	// RPC で検索候補を取得
	const { data: rpcData, error: rpcError } = await supabase.rpc(
		"search_suggestions",
		{ query },
	);
	if (rpcError || !rpcData) {
		return (
			<div className="p-4 text-red-600">
				検索に失敗しました: {rpcError?.message ?? "不明なエラー"}
			</div>
		);
	}

	const rows = rpcData as SuggestionRow[];
	// カード候補の deck_id をまとめて取得
	const cards = rows.filter((r) => r.type === "card");
	let deckMap = new Map<string, string>();
	if (cards.length > 0) {
		const { data: cardData, error: cardError } = await supabase
			.from("cards")
			.select("id, deck_id")
			.in(
				"id",
				cards.map((c) => c.id),
			);
		if (!cardError && cardData) {
			deckMap = new Map(cardData.map((row) => [row.id, row.deck_id]));
		}
	}

	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold mb-4">検索結果: {query}</h1>
			{rows.length === 0 ? (
				<p>該当する結果がありません。</p>
			) : (
				<ul className="space-y-2">
					{rows.map((r) => {
						const href =
							r.type === "card"
								? `/decks/${encodeURIComponent(deckMap.get(r.id) ?? "")}`
								: `/pages/${encodeURIComponent(r.id)}`;
						return (
							<li key={`${r.type}-${r.id}`}>
								<Link href={href} className="text-blue-600 hover:underline">
									{r.suggestion}
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
