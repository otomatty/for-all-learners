"use client";

import { Container } from "@/components/layouts/container";
import { useDeckPermissions } from "@/hooks/decks";
import { AudioCardGenerator } from "./AudioCardGenerator";

interface AudioPageClientProps {
	deckId: string;
	userId: string;
}

export function AudioPageClient({ deckId, userId }: AudioPageClientProps) {
	const { deck, canEdit, isLoading } = useDeckPermissions(deckId, userId);

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
			<AudioCardGenerator deckId={deckId} userId={userId} />
		</Container>
	);
}
