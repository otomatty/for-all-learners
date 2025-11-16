"use client";

import { useQuery } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/core";
import { useMemo } from "react";
import { toast } from "sonner";
import { useCardsByDeck } from "@/hooks/cards";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import { CardsListClient } from "./CardsListClient";
import { CardsListSkeleton } from "./CardsListSkeleton";

interface CardsListProps {
	deckId: string;
	canEdit: boolean;
	userId: string;
}

export function CardsList({ deckId, canEdit, userId }: CardsListProps) {
	const {
		data: fetchedCards,
		isLoading: isLoadingCards,
		error: cardsError,
	} = useCardsByDeck(deckId);

	// ユーザーの全ページを取得し、タイトル→IDマップを作成
	const supabase = createClient();
	const { data: userPagesData } = useQuery({
		queryKey: ["pages", "user", userId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("pages")
				.select("id,title")
				.eq("user_id", userId);
			if (error) throw error;
			return data ?? [];
		},
		enabled: !!userId,
	});

	const pagesMap = useMemo(() => {
		return new Map<string, string>(
			(userPagesData ?? []).map((p: { title: string; id: string }) => [
				p.title,
				p.id,
			]),
		);
	}, [userPagesData]);

	const cards = useMemo(() => {
		if (!fetchedCards) return [];

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

		return fetchedCards.map((card) => ({
			...card,
			front_content: transformPageLinks(card.front_content as JSONContent),
		}));
	}, [fetchedCards, pagesMap]);

	if (cardsError) {
		logger.error({ error: cardsError, deckId }, "Failed to fetch cards");
		toast.error("カードの読み込みに失敗しました");
	}

	const isLoading = isLoadingCards || !userPagesData;

	if (isLoading) {
		return <CardsListSkeleton deckId={deckId} />;
	}

	return <CardsListClient cards={cards} deckId={deckId} canEdit={canEdit} />;
}
