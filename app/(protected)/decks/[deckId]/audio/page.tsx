import { redirect } from "next/navigation";
import { getDeckById } from "@/app/_actions/decks";
import { Container } from "@/components/layouts/container";
import { createClient } from "@/lib/supabase/server";
import { AudioCardGenerator } from "../_components/audio-card-generator";
export default async function AudioPage({
	params,
}: {
	params: Promise<{ deckId: string }>;
}) {
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

	// デッキの所有者か共有編集権限か確認
	const isOwner = deck.user_id === user.id;
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
	if (!canEdit) {
		redirect(`/decks/${deckId}`);
	}

	return (
		<Container>
			<AudioCardGenerator deckId={deckId} userId={user.id} />
		</Container>
	);
}
