"use client";
import React from "react";
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
import { QuizSettingsDialog } from "@/components/QuizSettingsDialog";
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
}
interface DecksTableProps {
	decks: Deck[];
	onRemove?: (deckId: string) => void;
}

export function DecksTable({ decks, onRemove }: DecksTableProps) {
	const userId = useAtomValue(userIdAtom);
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>デッキ名</TableHead>
					<TableHead>カード数</TableHead>
					<TableHead />
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
						<TableCell>
							<QuizSettingsDialog
								deckId={deck.id}
								deckTitle={deck.title}
								triggerText="学習を始める"
							/>
						</TableCell>
						<TableCell>
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
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
