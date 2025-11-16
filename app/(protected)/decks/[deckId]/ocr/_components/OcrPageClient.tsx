"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layouts/container";
import { useDeck } from "@/hooks/decks";
import { createClient } from "@/lib/supabase/client";
import { ImageCardGenerator } from "./ImageCardGenerator";

interface OcrPageClientProps {
	deckId: string;
	userId: string;
}

export function OcrPageClient({ deckId, userId }: OcrPageClientProps) {
	const { data: deck, isLoading } = useDeck(deckId);
	const [canEdit, setCanEdit] = useState(false);

	useEffect(() => {
		if (!deck) return;

		const isOwner = deck.user_id === userId;
		if (!isOwner) {
			const supabase = createClient();
			void Promise.resolve(
				supabase
					.from("deck_shares")
					.select("permission_level")
					.eq("deck_id", deckId)
					.eq("shared_with_user_id", userId)
					.single(),
			)
				.then(({ data: share }) => {
					if (share) {
						const permission = share.permission_level;
						setCanEdit(permission === "edit");
					} else {
						window.location.href = "/decks";
					}
				})
				.catch(() => {
					window.location.href = "/decks";
				});
		} else {
			setCanEdit(true);
		}
	}, [deck, deckId, userId]);

	if (isLoading) {
		return (
			<Container>
				<div className="flex items-center justify-center h-40">
					<p className="text-muted-foreground">読み込み中...</p>
				</div>
			</Container>
		);
	}

	if (!deck || !canEdit) {
		return null; // redirect will happen in useEffect
	}

	return (
		<Container>
			<ImageCardGenerator deckId={deckId} userId={userId} />
		</Container>
	);
}
