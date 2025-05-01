"use client";

import React from "react";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { userIdAtom } from "@/stores/user";
import { QuizSettingsDialog } from "@/components/QuizSettingsDialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { DeckForm } from "@/app/(protected)/decks/_components/deck-form";

interface Deck {
	id: string;
	title: string;
	card_count: number;
}

interface MobileDecksListProps {
	decks: Deck[];
	onRemove?: (deckId: string) => void;
}

export function MobileDecksList({ decks, onRemove }: MobileDecksListProps) {
	const userId = useAtomValue(userIdAtom);

	if (decks.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500">デッキがありません</div>
		);
	}

	return (
		<div>
			{decks.map((deck, index) => (
				<React.Fragment key={deck.id}>
					<div className="py-3 ">
						<div className="flex flex-col">
							<Link
								href={`/decks/${deck.id}`}
								className="text-lg font-semibold text-blue-500 hover:underline"
							>
								{deck.title}
							</Link>
							<p className="text-sm text-muted-foreground mt-1">
								{deck.card_count} 枚
							</p>
						</div>
						<div className="flex items-center space-x-2">
							<QuizSettingsDialog
								deckId={deck.id}
								deckTitle={deck.title}
								triggerText="学習を始める"
							/>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon">
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{userId && (
										<DropdownMenuItem>
											<ResponsiveDialog
												triggerText="編集"
												dialogTitle="デッキを編集"
												dialogDescription="デッキタイトルと説明を編集してください"
												triggerButtonProps={{
													variant: "ghost",
													className: "w-full justify-start",
													onClick: (e) => e.stopPropagation(),
												}}
											>
												<DeckForm userId={userId} />
											</ResponsiveDialog>
										</DropdownMenuItem>
									)}
									<DropdownMenuItem asChild>
										<Link href={`/decks/${deck.id}/audio`}>音読</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link href={`/decks/${deck.id}/ocr`}>写真</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									{onRemove && (
										<DropdownMenuItem
											className="text-destructive"
											onClick={() => onRemove(deck.id)}
										>
											削除
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
					{index < decks.length - 1 && <Separator />}
				</React.Fragment>
			))}
		</div>
	);
}
