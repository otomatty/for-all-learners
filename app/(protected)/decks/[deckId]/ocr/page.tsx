import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDeckById } from "@/app/_actions/decks";
import { ImageCardGenerator } from "../_components/image-card-generator";

export default async function OcrPage({
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

	const deck = await getDeckById(deckId);
	if (!deck) {
		redirect("/decks");
	}

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

	return <ImageCardGenerator deckId={deckId} userId={user.id} />;
}
