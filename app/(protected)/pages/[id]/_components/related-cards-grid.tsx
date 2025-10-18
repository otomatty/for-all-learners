"use client";

import type { JSONContent } from "@tiptap/react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

interface RelatedCardsGridProps {
	pageId: string;
}

export default function RelatedCardsGrid({ pageId }: RelatedCardsGridProps) {
	const [cards, setCards] = useState<
		Database["public"]["Tables"]["cards"]["Row"][]
	>([]);

	useEffect(() => {
		const supabase = createClient();
		const fetchCards = async () => {
			// 1. get card_page_links for this page
			const { data: links, error: linksError } = await supabase
				.from("card_page_links")
				.select("card_id")
				.eq("page_id", pageId);
			if (linksError) {
				toast.error("関連カードの取得に失敗しました");
				return;
			}
			const cardIds = links?.map((l: { card_id: string }) => l.card_id) ?? [];
			if (cardIds.length === 0) {
				setCards([]);
				return;
			}
			// 2. fetch card details
			const { data: cardsData, error: cardsError } = await supabase
				.from("cards")
				.select("*")
				.in("id", cardIds as string[]);
			if (cardsError) {
				toast.error("関連カードの取得に失敗しました");
				return;
			}
			setCards(cardsData ?? []);
		};
		fetchCards();
	}, [pageId]);

	if (cards.length === 0) return null;

	// Helper to extract plain text
	const extractText = (node: JSONContent): string => {
		if (node.type === "text" && typeof node.text === "string") return node.text;
		if (node.content && Array.isArray(node.content))
			return node.content.map(extractText).join("");
		return "";
	};

	return (
		<section className="max-w-5xl mx-auto">
			<h2 className="text-lg font-semibold mb-2">関連カード</h2>
			<div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{cards.map((card) => (
					<Card
						key={card.id}
						className="h-full overflow-hidden transition-all hover:shadow-md py-2 md:py-4 gap-2"
					>
						<CardContent className="p-2 md:p-4">
							<p className="line-clamp-5 text-sm text-muted-foreground">
								{extractText(card.front_content as JSONContent)
									.replace(/\s+/g, " ")
									.trim()}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	);
}
