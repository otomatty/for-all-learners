"use client";

import { createDeckAction } from "@/app/_actions/decks";
import type { Deck } from "@/app/_actions/goal-decks";
import {
	addGoalDeckLink,
	getAvailableDecksForGoal,
} from "@/app/_actions/goal-decks";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import React, { useState, useEffect, useTransition, useCallback } from "react";
import { DecksTableSkeleton } from "./decks-table-skeleton";

interface AddDeckLinkDialogProps {
	goalId: string;
	onSuccess: () => void;
	/** ボタンのテキスト表示を上書きします */
	triggerText?: string;
}

/**
 * ダイアログで目標にデッキを追加するコンポーネント
 */
export function AddDeckLinkDialog({
	goalId,
	onSuccess,
	triggerText = "デッキを追加",
}: AddDeckLinkDialogProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [availableDecks, setAvailableDecks] = useState<Deck[]>([]);
	const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
	const [newDeckTitle, setNewDeckTitle] = useState<string>("");
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (isDialogOpen) {
			// Reset new deck creation state each time dialog opens
			setIsCreatingNew(false);
			// Open時のみ実行
			startTransition(async () => {
				const decks = await getAvailableDecksForGoal(goalId);
				setAvailableDecks(decks);
			});
		}
	}, [goalId, isDialogOpen]);

	const handleAddSelected = useCallback(() => {
		startTransition(async () => {
			for (const deckId of selectedDeckIds) {
				await addGoalDeckLink(goalId, deckId);
			}
			onSuccess();
			setIsDialogOpen(false);
			const decks = await getAvailableDecksForGoal(goalId);
			setAvailableDecks(decks);
			setSelectedDeckIds([]);
		});
	}, [goalId, selectedDeckIds, onSuccess]);

	const handleCreate = useCallback(() => {
		startTransition(async () => {
			const formData = new FormData();
			formData.append("title", newDeckTitle);
			const newDeck = await createDeckAction(formData);
			if (!newDeck || !newDeck.id) {
				throw new Error("新規デッキの作成に失敗しました。");
			}
			await addGoalDeckLink(goalId, newDeck.id);
			onSuccess();
			setIsDialogOpen(false);
			const decks = await getAvailableDecksForGoal(goalId);
			setAvailableDecks(decks);
			setSelectedDeckIds([]);
			setNewDeckTitle("");
		});
	}, [goalId, newDeckTitle, onSuccess]);

	return (
		<>
			<Button
				onClick={() => setIsDialogOpen(true)}
				className="w-full border-none shadow-none"
				variant="ghost"
			>
				{triggerText}
			</Button>
			<ResponsiveDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				dialogTitle="デッキ追加"
				className="!max-w-2xl"
			>
				<div className="space-y-2 p-4 overflow-auto">
					{isPending ? (
						<DecksTableSkeleton />
					) : (
						<Table className="w-full text-left">
							<TableHeader>
								<TableRow>
									<TableHead className="px-2 md:px-4 w-[80px]">選択</TableHead>
									<TableHead className="px-2 md:px-4">タイトル</TableHead>
									<TableHead className="hidden md:table-cell px-2 md:px-4">
										作成日
									</TableHead>
									<TableHead className="hidden sm:table-cell px-2 md:px-4">
										カード数
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{availableDecks.map((deck) => (
									<TableRow key={deck.id}>
										<TableCell>
											<Checkbox
												checked={selectedDeckIds.includes(deck.id)}
												onCheckedChange={(checked) => {
													if (checked) {
														setSelectedDeckIds((prev) => [...prev, deck.id]);
													} else {
														setSelectedDeckIds((prev) =>
															prev.filter((id) => id !== deck.id),
														);
													}
												}}
											/>
										</TableCell>
										<TableCell className="px-2 md:px-4">{deck.title}</TableCell>
										<TableCell className="hidden md:table-cell px-2 md:px-4">
											{new Date(deck.created_at).toLocaleDateString()}
										</TableCell>
										<TableCell className="hidden sm:table-cell px-2 md:px-4">
											{deck.card_count}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
					<div className="flex justify-end">
						<Button
							disabled={isPending || selectedDeckIds.length === 0}
							onClick={handleAddSelected}
						>
							選択したデッキを追加
						</Button>
					</div>
					<div className="pt-4 border-t border-border">
						{!isCreatingNew ? (
							<Button
								variant="ghost"
								className="w-full"
								onClick={() => setIsCreatingNew(true)}
							>
								新しいデッキを作成する
							</Button>
						) : (
							<div className="space-y-2">
								<Input
									placeholder="タイトルを入力"
									value={newDeckTitle}
									onChange={(e) => setNewDeckTitle(e.currentTarget.value)}
								/>
								<div className="flex justify-end space-x-2">
									<Button
										variant="ghost"
										onClick={() => {
											setIsCreatingNew(false);
											setNewDeckTitle("");
										}}
									>
										キャンセル
									</Button>
									<Button
										disabled={isPending || !newDeckTitle}
										onClick={handleCreate}
									>
										新規デッキを作成して追加
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</ResponsiveDialog>
		</>
	);
}
