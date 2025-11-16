"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface Deck {
	id: string;
	title: string;
}

interface DeckSelectorProps {
	decks: Deck[];
	currentDeckId: string;
}

export default function DeckSelector({
	decks,
	currentDeckId,
}: DeckSelectorProps) {
	const router = useRouter();
	const handleChange = useCallback(
		(value: string) => {
			if (value && value !== currentDeckId) {
				router.push(`/decks/${value}`);
			}
		},
		[router, currentDeckId],
	);

	return (
		<div className="mb-6 max-w-md bg-background">
			<Select value={currentDeckId} onValueChange={handleChange}>
				<SelectTrigger className="w-full text-lg font-semibold">
					<SelectValue placeholder="デッキを選択" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{decks.map((deck) => (
							<SelectItem key={deck.id} value={deck.id}>
								{deck.title}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
