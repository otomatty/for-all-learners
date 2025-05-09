"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectGroup,
	SelectLabel,
	SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Deck } from "@/app/_actions/goal-decks";
import {
	getAvailableDecksForGoal,
	addGoalDeckLink,
} from "@/app/_actions/goal-decks";
import { createDeckAction } from "@/app/_actions/decks";
import { Input } from "@/components/ui/input";

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
	const [selectedDeckId, setSelectedDeckId] = useState<string>("");
	const [newDeckTitle, setNewDeckTitle] = useState<string>("");
	const [isPending, startTransition] = useTransition();
	// 特殊値: 新規作成モード
	const CREATE_NEW_VALUE = "__new__";

	useEffect(() => {
		if (isDialogOpen) {
			// Open時のみ実行
			startTransition(async () => {
				const decks = await getAvailableDecksForGoal(goalId);
				setAvailableDecks(decks);
			});
		}
	}, [goalId, isDialogOpen]);

	const handleAdd = useCallback(() => {
		startTransition(async () => {
			await addGoalDeckLink(goalId, selectedDeckId);
			onSuccess();
			setIsDialogOpen(false);
			const decks = await getAvailableDecksForGoal(goalId);
			setAvailableDecks(decks);
			setSelectedDeckId("");
		});
	}, [goalId, selectedDeckId, onSuccess]);

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
			setSelectedDeckId("");
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
			>
				<div className="space-y-2 p-4">
					<Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
						<SelectTrigger>
							<SelectValue placeholder="選択してください" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>デッキを選択</SelectLabel>
								{/* 新規作成オプション */}
								<SelectItem key={CREATE_NEW_VALUE} value={CREATE_NEW_VALUE}>
									新規デッキを追加
								</SelectItem>
								{availableDecks.map((deck) => (
									<SelectItem key={deck.id} value={deck.id}>
										{deck.title} ({deck.card_count})
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					{/* 選択に応じて表示切替 */}
					{selectedDeckId && selectedDeckId !== CREATE_NEW_VALUE && (
						<Button disabled={isPending} onClick={handleAdd}>
							既存デッキを追加
						</Button>
					)}
					{selectedDeckId === CREATE_NEW_VALUE && (
						<div className="pt-4 border-t space-y-2">
							<p className="text-sm font-medium">新規デッキを作成</p>
							<Input
								placeholder="タイトルを入力"
								value={newDeckTitle}
								onChange={(e) => setNewDeckTitle(e.currentTarget.value)}
							/>
							<Button
								disabled={isPending || !newDeckTitle}
								onClick={handleCreate}
							>
								新規デッキを作成して追加
							</Button>
						</div>
					)}
				</div>
			</ResponsiveDialog>
		</>
	);
}
