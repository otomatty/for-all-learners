"use client";

import { useAtomValue } from "jotai";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { DeckForm } from "@/components/decks/DeckForm";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { QuizSettingsDialog } from "@/components/quiz-settings-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { userIdAtom } from "@/stores/user";

interface Deck {
	id: string;
	title: string;
	card_count: number;
	todayReviewCount: number;
	description?: string; // Add optional description
	is_public?: boolean; // Add optional is_public
}

interface MobileDecksListProps {
	decks: Deck[];
	onRemove?: (deckId: string) => void;
}

export function MobileDecksList({ decks, onRemove }: MobileDecksListProps) {
	const userId = useAtomValue(userIdAtom);
	const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

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
							<div className="flex flex-row justify-between space-x-2">
								<div>
									<p className="text-sm text-muted-foreground mt-1">
										合計カード数: {deck.card_count} 枚
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										今日のレビュー数: {deck.todayReviewCount} 枚
									</p>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon">
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{userId && (
											<>
												<DropdownMenuItem
													onSelect={() => setEditingDeckId(deck.id)}
												>
													編集
												</DropdownMenuItem>
												<ResponsiveDialog
													open={editingDeckId === deck.id}
													onOpenChange={(isOpen) => {
														if (!isOpen) {
															setEditingDeckId(null);
														}
													}}
													dialogTitle="デッキを編集"
													dialogDescription="デッキタイトルと説明を編集してください"
												>
													<DeckForm
														userId={userId}
														deckId={deck.id}
														initialTitle={deck.title}
														initialDescription={deck.description}
														initialIsPublic={deck.is_public}
														onSuccess={() => setEditingDeckId(null)}
													/>
												</ResponsiveDialog>
											</>
										)}
										<DropdownMenuItem asChild>
											<Link href={`/decks/${deck.id}/audio`}>音読</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href={`/decks/${deck.id}/ocr`}>画像</Link>
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
						<div className="mt-2 space-y-2">
							<QuizSettingsDialog
								deckId={deck.id}
								deckTitle={deck.title}
								triggerText="学習を始める"
							/>
							<QuizSettingsDialog
								deckId={deck.id}
								deckTitle={deck.title}
								triggerText="復習する"
								reviewMode={true}
								reviewCount={deck.todayReviewCount}
								disabled={deck.todayReviewCount === 0}
							/>
						</div>
					</div>
					{index < decks.length - 1 && <Separator />}
				</React.Fragment>
			))}
		</div>
	);
}
