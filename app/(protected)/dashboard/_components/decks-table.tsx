"use client";
import React, { useState } from "react";
import {
	Table,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { QuizSettingsDialog } from "@/components/quiz-settings-dialog";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useAtomValue } from "jotai";
import { userIdAtom } from "@/stores/user";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { DeckForm } from "@/app/(protected)/decks/_components/deck-form";

interface Deck {
	id: string;
	title: string;
	card_count: number;
	todayReviewCount: number;
	description: string;
	is_public: boolean;
}
interface DecksTableProps {
	decks: Deck[];
	onRemove?: (deckId: string) => void;
}

export function DecksTable({ decks, onRemove }: DecksTableProps) {
	const userId = useAtomValue(userIdAtom);
	const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
	const editingDeck = decks.find((deck) => deck.id === editingDeckId);

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>デッキ名</TableHead>
						<TableHead>カード数</TableHead>
						<TableHead>今日のカード数</TableHead>
						<TableHead>学習を始める</TableHead>
						<TableHead>復習する</TableHead>
						<TableHead>操作</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{decks.map((deck) => (
						<TableRow key={deck.id}>
							<TableCell>
								<Link
									href={`/decks/${deck.id}`}
									className="text-blue-500 hover:underline"
								>
									{deck.title}
								</Link>
							</TableCell>
							<TableCell>{deck.card_count}</TableCell>
							<TableCell>{deck.todayReviewCount}</TableCell>
							<TableCell>
								<QuizSettingsDialog
									deckId={deck.id}
									deckTitle={deck.title}
									triggerText="学習を始める"
								/>
							</TableCell>
							<TableCell>
								<QuizSettingsDialog
									deckId={deck.id}
									deckTitle={deck.title}
									triggerText="復習する"
									reviewMode={true}
									reviewCount={deck.todayReviewCount}
									disabled={deck.todayReviewCount === 0}
								/>
							</TableCell>
							<TableCell>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon">
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="end"
										onCloseAutoFocus={(event) => event.preventDefault()}
									>
										{userId && (
											<DropdownMenuItem
												onSelect={() =>
													setTimeout(() => setEditingDeckId(deck.id), 0)
												}
											>
												編集
											</DropdownMenuItem>
										)}
										<DropdownMenuItem asChild>
											<Link href={`/decks/${deck.id}/audio`}>音読する</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href={`/decks/${deck.id}/ocr`}>写真を読み込む</Link>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										{onRemove && (
											<DropdownMenuItem
												className="text-destructive"
												onClick={() => onRemove(deck.id)}
											>
												削除する
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			{userId && editingDeck && (
				<ResponsiveDialog
					open={!!editingDeckId}
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
						deckId={editingDeck.id}
						initialTitle={editingDeck.title}
						initialDescription={editingDeck.description}
						initialIsPublic={editingDeck.is_public}
						onSuccess={() => setEditingDeckId(null)}
					/>
				</ResponsiveDialog>
			)}
		</>
	);
}
