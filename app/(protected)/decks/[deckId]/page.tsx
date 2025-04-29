import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CardsList } from "./_components/cards-list";
import { getDeckById } from "@/app/_actions/decks";
import { getCardsByDeck } from "@/app/_actions/cards";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { CardForm } from "./_components/card-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

	// デッキ情報を取得
	const deck = await getDeckById(deckId);

	if (!deck) {
		redirect("/decks");
	}

	// デッキ内のカードを取得
	const cards = await getCardsByDeck(deckId);

	// サーバーサイドでユーザーの全ページを取得し、タイトル→IDマップを作成
	const { data: userPages } = await supabase
		.from("pages")
		.select("id,title")
		.eq("user_id", user.id);
	const pagesMap = new Map<string, string>(
		(userPages ?? []).map((p: any) => [p.title, p.id]),
	);

	// JSONContent の型をインポート
	// サーバーコンポーネントなので型だけ
	type JSONContent = import("@tiptap/core").JSONContent;
	// front_content 内の pageLink マークに pageId を埋め込む関数
	function transformPageLinks(doc: JSONContent): JSONContent {
		const recurse = (node: any): any => {
			// マークの更新
			if (node.marks) {
				node.marks = node.marks.map((mark: any) => {
					if (mark.type === "pageLink") {
						const name = mark.attrs.pageName as string;
						const id = pagesMap.get(name) ?? null;
						return { ...mark, attrs: { pageName: name, pageId: id } };
					}
					return mark;
				});
			}
			// 子ノードを再帰処理
			if (node.content && Array.isArray(node.content)) {
				node.content = node.content.map(recurse);
			}
			return node;
		};
		const root = { ...doc };
		root.content = (root.content ?? []).map(recurse);
		return root;
	}
	// cards を変換して decoratedCards として使う
	const decoratedCards = cards.map((card) => ({
		...card,
		front_content: transformPageLinks(card.front_content as JSONContent),
	}));

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
		<>
			{canEdit && (
				<div className="flex justify-end mb-4 space-x-2">
					<ResponsiveDialog
						triggerText="新規カード"
						dialogTitle="カードを作成"
						dialogDescription="カードの表面（質問）と裏面（回答）を入力してください"
					>
						<CardForm deckId={deckId} userId={user.id} />
					</ResponsiveDialog>
					<Button asChild>
						<Link href={`/decks/${deckId}/audio`}>音読する</Link>
					</Button>
				</div>
			)}
			<CardsList cards={decoratedCards} deckId={deckId} canEdit={canEdit} />
		</>
	);
}
