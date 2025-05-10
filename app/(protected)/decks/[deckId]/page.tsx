import React, { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CardsList } from "./_components/cards-list";
import { getDeckById, getDecksByUser } from "@/app/_actions/decks";
import { getCardsByDeck } from "@/app/_actions/cards";
import DeckSelector from "./_components/deck-selector";
import ActionMenu from "./_components/action-menu";
import { CardsListSkeleton } from "./_components/cards-list-skeleton";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";

export default async function DeckPage({
	params,
}: { params: Promise<{ deckId: string }> }) {
	// Await dynamic route params
	const { deckId } = await params;
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	// Fetch all user decks for selector
	const userDecks = await getDecksByUser(user.id);
	const decksList = userDecks.map(({ id, title }) => ({ id, title }));

	// デッキ情報を取得
	const deck = await getDeckById(deckId);

	if (!deck) {
		redirect("/decks");
	}

	// デッキの所有者かどうかを確認
	const isOwner = deck.user_id === user.id;

	// 共有されているデッキの場合、権限を確認
	let permission = "none";
	if (!isOwner) {
		const { data: share } = await supabase
			.from("deck_shares")
			.select("permission_level")
			.eq("deck_id", deckId)
			.eq("shared_with_user_id", user.id)
			.single();

		if (share) {
			permission = share.permission_level;
		} else {
			redirect("/decks");
		}
	}

	const canEdit = isOwner || permission === "edit";

	return (
		<Container>
			<div className="mb-6">
				<BackLink title="デッキ一覧に戻る" path="/decks" />
			</div>
			<DeckSelector decks={decksList} currentDeckId={deckId} />
			{canEdit && (
				<ActionMenu
					deckId={deckId}
					userId={user.id}
					deckTitle={deck.title}
					deckDescription={deck.description ?? ""}
					deckIsPublic={deck.is_public ?? false}
				/>
			)}
			<Suspense fallback={<CardsListSkeleton deckId={deckId} />}>
				<CardsListWrapper deckId={deckId} canEdit={canEdit} userId={user.id} />
			</Suspense>
		</Container>
	);
}

/**
 * CardsList とそのデータフェッチおよび加工ロジックをラップする
 * 非同期サーバーコンポーネント。
 * Suspense と組み合わせて使用することで、データ取得中にフォールバックUIを表示できる。
 */
async function CardsListWrapper({
	deckId,
	canEdit,
	userId,
}: {
	deckId: string;
	canEdit: boolean;
	userId: string;
}) {
	// Supabaseクライアントを再度初期化（サーバーコンポーネント内での呼び出しは軽量）
	const supabase = await createClient();

	// デッキ内のカードを取得
	const cards = await getCardsByDeck(deckId);

	// ユーザーの全ページを取得し、タイトル→IDマップを作成
	const { data: userPages } = await supabase
		.from("pages")
		.select("id,title")
		.eq("user_id", userId);
	const pagesMap = new Map<string, string>(
		(userPages ?? []).map((p: { title: string; id: string }) => [
			p.title,
			p.id,
		]),
	);

	type JSONContent = import("@tiptap/core").JSONContent;
	type MarkJSON = { type: string; attrs?: Record<string, unknown> };

	function transformPageLinks(doc: JSONContent): JSONContent {
		const recurse = (node: JSONContent): JSONContent => {
			if (node.marks) {
				node.marks = (node.marks as MarkJSON[]).map((mark) =>
					mark.type === "pageLink"
						? {
								...mark,
								attrs: {
									...mark.attrs,
									pageId: pagesMap.get(mark.attrs?.pageName as string) ?? null,
								},
							}
						: mark,
				);
			}
			if (node.content && Array.isArray(node.content)) {
				node.content = node.content.map(recurse);
			}
			return node;
		};
		const root = { ...doc };
		root.content = (root.content ?? []).map(recurse);
		return root;
	}

	const decoratedCards = cards.map((card) => ({
		...card,
		front_content: transformPageLinks(card.front_content as JSONContent),
	}));

	return <CardsList cards={decoratedCards} deckId={deckId} canEdit={canEdit} />;
}
