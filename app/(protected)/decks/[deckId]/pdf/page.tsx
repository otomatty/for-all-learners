import { getDeckById } from "@/app/_actions/decks";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PdfCardGenerator } from "../_components/pdf-card-generator";

export default async function PdfGeneratorPage({
	params,
}: { params: Promise<{ deckId: string }> }) {
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

	// デッキの所有者かどうかを確認
	const isOwner = deck.user_id === user.id;

	// 共有されているデッキの場合、権限を確認
	let canEdit = isOwner;
	if (!isOwner) {
		const { data: share } = await supabase
			.from("deck_shares")
			.select("permission_level")
			.eq("deck_id", deckId)
			.eq("shared_with_user_id", user.id)
			.single();

		if (share?.permission_level === "edit") {
			canEdit = true;
		} else {
			redirect("/decks");
		}
	}

	if (!canEdit) {
		redirect(`/decks/${deckId}`);
	}

	return (
		<Container>
			<BackLink title={`${deck.title} に戻る`} path={`/decks/${deckId}`} />
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">PDF過去問からカード生成</h1>
					<p className="text-muted-foreground">
						PDFファイルから問題と解答を自動抽出してフラッシュカードを作成します
					</p>
				</div>
				<PdfCardGenerator deckId={deckId} userId={user.id} />
			</div>
		</Container>
	);
}
