"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { useDeck } from "@/hooks/decks";
import { createClient } from "@/lib/supabase/client";
import { PdfCardGenerator } from "../_components/PdfCardGenerator/PdfCardGenerator";

interface PdfGeneratorPageClientProps {
	deckId: string;
	userId: string;
}

export function PdfGeneratorPageClient({
	deckId,
	userId,
}: PdfGeneratorPageClientProps) {
	const { data: deck, isLoading } = useDeck(deckId);
	const [canEdit, setCanEdit] = useState(false);

	useEffect(() => {
		if (!deck) return;

		// デッキの所有者かどうかを確認
		const isOwner = deck.user_id === userId;

		// 共有されているデッキの場合、権限を確認
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
					if (share?.permission_level === "edit") {
						setCanEdit(true);
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
