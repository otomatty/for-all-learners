"use client";

import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { useDeckPermissions } from "@/hooks/decks";
import { PdfCardGenerator } from "../_components/PdfCardGenerator/PdfCardGenerator";

interface PdfGeneratorPageClientProps {
	deckId: string;
	userId: string;
}

export function PdfGeneratorPageClient({
	deckId,
	userId,
}: PdfGeneratorPageClientProps) {
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
			<BackLink title={`${deck.title} に戻る`} path={`/decks/${deckId}`} />
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">PDF過去問からカード生成</h1>
					<p className="text-muted-foreground">
						PDFファイルから問題と解答を自動抽出してフラッシュカードを作成します
					</p>
				</div>
				<PdfCardGenerator deckId={deckId} userId={userId} />
			</div>
		</Container>
	);
}
