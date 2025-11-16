"use client";

import { Container } from "@/components/layouts/container";
import { useDeckPermissions } from "@/hooks/decks";
import { ImageCardGenerator } from "./ImageCardGenerator";

interface OcrPageClientProps {
	deckId: string;
	userId: string;
}

export function OcrPageClient({ deckId, userId }: OcrPageClientProps) {
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
			<ImageCardGenerator deckId={deckId} userId={userId} />
		</Container>
	);
}
