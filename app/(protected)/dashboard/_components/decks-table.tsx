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

interface Deck {
	id: string;
	title: string;
	card_count: number;
}
interface DecksTableProps {
	decks: Deck[];
	onLog: (deckId: string) => void;
	onRemove?: (deckId: string) => void;
}

export function DecksTable({ decks, onLog, onRemove }: DecksTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>デッキ名</TableHead>
					<TableHead>カード数</TableHead>
					<TableHead>アクション</TableHead>
					{onRemove && <TableHead>削除</TableHead>}
				</TableRow>
			</TableHeader>
			<TableBody>
				{decks.map((deck) => (
					<TableRow key={deck.id}>
						<TableCell>{deck.title}</TableCell>
						<TableCell>{deck.card_count}</TableCell>
						<TableCell>
							<Button size="sm" onClick={() => onLog(deck.id)}>
								記録
							</Button>
						</TableCell>
						{onRemove && (
							<TableCell>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => onRemove(deck.id)}
								>
									削除
								</Button>
							</TableCell>
						)}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
