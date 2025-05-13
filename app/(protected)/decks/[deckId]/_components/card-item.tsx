"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/types/database.types";
import type React from "react";
import { CardContextMenu } from "./card-context-menu";
import { RichContent } from "./rich-content";

interface CardItemProps {
	card?: Database["public"]["Tables"]["cards"]["Row"]; // オプショナルに変更
	isBlurred: boolean;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void;
	onMouseMove?: (event: React.MouseEvent<HTMLDivElement>) => void;
	onMouseUp?: (event: React.MouseEvent<HTMLDivElement>) => void;
	deckId: string;
	userId: string | null;
	canEdit: boolean;
	onCardUpdated?: (
		updatedCard: Database["public"]["Tables"]["cards"]["Row"],
	) => void;
	isLoading?: boolean;
}

export function CardItem({
	card,
	isBlurred,
	onMouseEnter,
	onMouseLeave,
	onMouseDown,
	onMouseMove,
	onMouseUp,
	deckId,
	userId,
	canEdit,
	onCardUpdated,
	isLoading,
}: CardItemProps) {
	if (isLoading) {
		return (
			<Card className="overflow-hidden">
				<CardContent>
					{" "}
					{/* Uses default CardContent padding (p-6) */}
					<div className="space-y-3 py-2">
						{" "}
						{/* Added py-2 to better align with prose */}
						<Skeleton className="h-5 w-3/4" /> {/* Simulating a title line */}
						<Skeleton className="h-4 w-full" />{" "}
						{/* Simulating a content line */}
						<Skeleton className="h-4 w-5/6" />{" "}
						{/* Simulating another content line */}
						<Skeleton className="h-4 w-1/2" />{" "}
						{/* Simulating a shorter content line */}
					</div>
				</CardContent>
			</Card>
		);
	}

	// isLoadingがfalseの場合、cardは必須
	if (!card) {
		console.error(
			"CardItem: 'card' prop is required when 'isLoading' is false.",
		);
		return null;
	}

	return (
		<CardContextMenu
			card={card}
			deckId={deckId}
			userId={userId}
			canEdit={canEdit}
			onCardUpdated={onCardUpdated || (() => {})}
		>
			<Card
				data-card-id={card.id} // key is typically applied by the parent mapping function to CardItem itself
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				onMouseDown={onMouseDown}
				onMouseMove={onMouseMove}
				onMouseUp={onMouseUp}
				className={`overflow-hidden cursor-pointer transition-all duration-300 ease-in-out ${
					isBlurred ? "filter blur-xs opacity-60" : "hover:shadow-lg"
				}`}
			>
				<CardContent>
					<div className="prose prose-sm rich-content">
						<RichContent content={card.front_content} />
					</div>
				</CardContent>
			</Card>
		</CardContextMenu>
	);
}
