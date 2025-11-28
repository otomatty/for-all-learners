import { createClient } from "@/lib/supabase/server";

interface DecksAndCardsProps {
	userId: string;
}

/**
 * Displays user's own decks, shared decks, and card statistics.
 */
export default async function DecksAndCards({ userId }: DecksAndCardsProps) {
	const supabase = await createClient();

	// Get user's own decks
	const { data: decks, error: decksError } = await supabase
		.from("decks")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	if (decksError) {
		throw new Error(`デッキの取得に失敗しました: ${decksError.message}`);
	}

	// Get shared decks
	const { data: sharedDecks, error: sharedDecksError } = await supabase
		.from("deck_shares")
		.select("*, decks(*)")
		.eq("shared_with_user_id", userId)
		.order("created_at", { ascending: false });

	if (sharedDecksError) {
		throw new Error(
			`共有デッキの取得に失敗しました: ${sharedDecksError.message}`,
		);
	}

	// Get cards
	const { data: cards, error: cardsError } = await supabase
		.from("cards")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	if (cardsError) {
		throw new Error(`カードの取得に失敗しました: ${cardsError.message}`);
	}

	// 日付文字列のフォーマット用ヘルパー
	const formatDate = (dateString: string | null): string =>
		dateString ? new Date(dateString).toLocaleString() : "-";

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">デッキ＆カード</h2>
			{/* 自作デッキ */}
			<section>
				<h3 className="text-md font-medium mb-2">自作デッキ</h3>
				{(decks?.length ?? 0) === 0 ? (
					<p>デッキがありません。</p>
				) : (
					<table className="w-full table-auto border-collapse">
						<thead>
							<tr>
								<th>タイトル</th>
								<th>説明</th>
								<th>公開</th>
								<th>作成日時</th>
								<th>更新日時</th>
							</tr>
						</thead>
						<tbody>
							{(decks || []).map((deck) => (
								<tr key={deck.id}>
									<td>{deck.title}</td>
									<td>{deck.description}</td>
									<td>{deck.is_public ? "公開" : "非公開"}</td>
									<td>{formatDate(deck.created_at)}</td>
									<td>{formatDate(deck.updated_at)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>
			{/* 共有デッキ */}
			<section>
				<h3 className="text-md font-medium mb-2">共有デッキ</h3>
				{(sharedDecks?.length ?? 0) === 0 ? (
					<p>共有デッキがありません。</p>
				) : (
					<table className="w-full table-auto border-collapse">
						<thead>
							<tr>
								<th>タイトル</th>
								<th>権限</th>
								<th>共有日時</th>
							</tr>
						</thead>
						<tbody>
							{(sharedDecks || []).map((share) => (
								<tr key={share.id}>
									<td>{(share.decks as { title: string }).title}</td>
									<td>{share.permission_level}</td>
									<td>{formatDate(share.created_at)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>
			{/* カード情報 */}
			<section>
				<h3 className="text-md font-medium mb-2">カード情報</h3>
				<p>合計カード数: {cards?.length ?? 0}</p>
				{(cards?.length ?? 0) > 0 && (
					<ul className="list-disc ml-5">
						{(cards || []).slice(0, 5).map((c) => (
							<li key={c.id}>{c.id}</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
