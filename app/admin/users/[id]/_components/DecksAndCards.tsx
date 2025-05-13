import { getCardsByUser } from "@/app/_actions/cards";
import { getDecksByUser, getSharedDecksByUser } from "@/app/_actions/decks";
import React from "react";

interface DecksAndCardsProps {
	userId: string;
}

/**
 * Displays user's own decks, shared decks, and card statistics.
 */
export default async function DecksAndCards({ userId }: DecksAndCardsProps) {
	const decks = await getDecksByUser(userId);
	const sharedDecks = await getSharedDecksByUser(userId);
	const cards = await getCardsByUser(userId);

	// 日付文字列のフォーマット用ヘルパー
	const formatDate = (dateString: string | null): string =>
		dateString ? new Date(dateString).toLocaleString() : "-";

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">デッキ＆カード</h2>
			{/* 自作デッキ */}
			<section>
				<h3 className="text-md font-medium mb-2">自作デッキ</h3>
				{decks.length === 0 ? (
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
							{decks.map((deck) => (
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
				{sharedDecks.length === 0 ? (
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
							{sharedDecks.map((share) => (
								<tr key={share.id}>
									<td>{share.decks.title}</td>
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
				<p>合計カード数: {cards.length}</p>
				{cards.length > 0 && (
					<ul className="list-disc ml-5">
						{cards.slice(0, 5).map((c) => (
							<li key={c.id}>{c.id}</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
