"use client";
import { DeckForm } from "@/app/(protected)/decks/_components/deck-form";
import { QuizSettingsDialog } from "@/components/quiz-settings-dialog";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { userIdAtom } from "@/stores/user";
import { useAtomValue } from "jotai";
import { Camera, MoreHorizontal, Pencil, Trash2, Volume2 } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

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
			<Table className="text-center">
				<TableHeader>
					<TableRow>
						<TableHead className="text-center">デッキ名</TableHead>
						<TableHead className="text-center">カード数</TableHead>
						<TableHead className="text-center">今日のカード数</TableHead>
						<TableHead className="text-center">学習を始める</TableHead>
						<TableHead className="text-center">復習する</TableHead>
						<TableHead className="text-center">操作</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{decks.map((deck) => (
						<TableRow key={deck.id}>
							<TableCell className="text-left">
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
										<DropdownMenuItem asChild>
											<Link
												href={`/decks/${deck.id}/audio`}
												className="flex items-center"
											>
												<Volume2 className="h-4 w-4" />
												音読する
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link
												href={`/decks/${deck.id}/ocr`}
												className="flex items-center"
											>
												<Camera className="h-4 w-4" />
												画像を読み込む
											</Link>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										{userId && (
											<DropdownMenuItem
												onSelect={() =>
													setTimeout(() => setEditingDeckId(deck.id), 0)
												}
											>
												<Pencil className="h-4 w-4" />
												編集する
											</DropdownMenuItem>
										)}
										{onRemove && (
											<DropdownMenuItem
												className="text-destructive"
												onClick={() => onRemove(deck.id)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
												<span className="text-destructive">削除する</span>
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
