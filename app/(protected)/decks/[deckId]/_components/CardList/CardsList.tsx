"use client";

import type { JSONContent } from "@tiptap/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCardsByDeck } from "@/app/_actions/cards";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { CardsListClient } from "./CardsListClient";
import { CardsListSkeleton } from "./CardsListSkeleton";

interface CardsListProps {
	deckId: string;
	canEdit: boolean;
	userId: string;
}

export function CardsList({ deckId, canEdit, userId }: CardsListProps) {
	const [cards, setCards] = useState<
		Database["public"]["Tables"]["cards"]["Row"][]
	>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchCards = async () => {
			setIsLoading(true);
			try {
				const fetchedCards = await getCardsByDeck(deckId);
				const supabase = createClient();

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
												pageId:
													pagesMap.get(mark.attrs?.pageName as string) ?? null,
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

				const decoratedCards = fetchedCards.map((card) => ({
					...card,
					front_content: transformPageLinks(card.front_content as JSONContent),
				}));

				setCards(decoratedCards);
			} catch (error) {
				logger.error({ error, deckId }, "Failed to fetch cards");
				toast.error("カードの読み込みに失敗しました");
			} finally {
				setIsLoading(false);
			}
		};

		fetchCards();
	}, [deckId, userId]);

	if (isLoading) {
		return <CardsListSkeleton deckId={deckId} />;
	}

	return <CardsListClient cards={cards} deckId={deckId} canEdit={canEdit} />;
}
