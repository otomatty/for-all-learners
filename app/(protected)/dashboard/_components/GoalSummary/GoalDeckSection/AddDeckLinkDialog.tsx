"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useCreateDeck } from "@/hooks/decks";
import {
	useAddGoalDeckLink,
	useGetAvailableDecksForGoal,
	type Deck,
} from "@/hooks/goal_decks";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DecksTableSkeleton } from "./DecksTableSkeleton";

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
	const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [sortBy, setSortBy] = useState<string>("updated_at_desc");
	const [newDeckTitle, setNewDeckTitle] = useState<string>("");
	const [isCreatingNew, setIsCreatingNew] = useState(false);

	const { data: availableDecks = [], isLoading: isLoadingDecks } =
		useGetAvailableDecksForGoal(goalId);
	const addGoalDeckLinkMutation = useAddGoalDeckLink();
	const createDeckMutation = useCreateDeck();

	useEffect(() => {
		if (isDialogOpen) {
			// Reset states each time dialog opens
			setIsCreatingNew(false);
			setSearchQuery("");
			setSortBy("updated_at_desc");
			setSelectedDeckIds([]);
		}
	}, [goalId, isDialogOpen]);

	const handleAddSelected = useCallback(async () => {
		for (const deckId of selectedDeckIds) {
			await addGoalDeckLinkMutation.mutateAsync({ goalId, deckId });
		}
		onSuccess();
		setIsDialogOpen(false);
		setSelectedDeckIds([]);
	}, [goalId, selectedDeckIds, onSuccess, addGoalDeckLinkMutation]);

	const handleCreate = useCallback(async () => {
		const newDeck = await createDeckMutation.mutateAsync({
			title: newDeckTitle,
		});
		if (!newDeck || !newDeck.id) {
			throw new Error("新規デッキの作成に失敗しました。");
		}
		await addGoalDeckLinkMutation.mutateAsync({ goalId, deckId: newDeck.id });
		onSuccess();
		setIsDialogOpen(false);
		setSelectedDeckIds([]);
		setNewDeckTitle("");
	}, [goalId, newDeckTitle, onSuccess, createDeckMutation, addGoalDeckLinkMutation]);

	// フィルタリングとソート
	const filteredAndSortedDecks = availableDecks
		.filter((deck) =>
			deck.title.toLowerCase().includes(searchQuery.toLowerCase()),
		)
		.sort((a, b) => {
			switch (sortBy) {
				case "updated_at_desc":
					return (
						new Date(b.updated_at || 0).getTime() -
						new Date(a.updated_at || 0).getTime()
					);
				case "updated_at_asc":
					return (
						new Date(a.updated_at || 0).getTime() -
						new Date(b.updated_at || 0).getTime()
					);
				case "created_at_desc":
					return (
						new Date(b.created_at || 0).getTime() -
						new Date(a.created_at || 0).getTime()
					);
				case "created_at_asc":
					return (
						new Date(a.created_at || 0).getTime() -
						new Date(b.created_at || 0).getTime()
					);
				case "title_asc":
					return a.title.localeCompare(b.title);
				case "title_desc":
					return b.title.localeCompare(a.title);
				case "card_count_desc":
					return (b.card_count || 0) - (a.card_count || 0);
				case "card_count_asc":
					return (a.card_count || 0) - (b.card_count || 0);
				default:
					return 0;
			}
		});

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
				<div className="space-y-2 p-4 max-h-[70vh] overflow-auto">
					{!isCreatingNew && (
						<>
							{/* 検索とソート */}
							<div className="flex gap-2 mb-4">
								<Input
									placeholder="デッキを検索"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="flex-1"
								/>
								<Select value={sortBy} onValueChange={setSortBy}>
									<SelectTrigger className="w-48">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="updated_at_desc">
											更新日（新しい順）
										</SelectItem>
										<SelectItem value="updated_at_asc">
											更新日（古い順）
										</SelectItem>
										<SelectItem value="created_at_desc">
											作成日（新しい順）
										</SelectItem>
										<SelectItem value="created_at_asc">
											作成日（古い順）
										</SelectItem>
										<SelectItem value="title_asc">タイトル（昇順）</SelectItem>
										<SelectItem value="title_desc">タイトル（降順）</SelectItem>
										<SelectItem value="card_count_desc">
											カード数（多い順）
										</SelectItem>
										<SelectItem value="card_count_asc">
											カード数（少ない順）
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{isLoadingDecks ||
							addGoalDeckLinkMutation.isPending ||
							createDeckMutation.isPending ? (
								<DecksTableSkeleton />
							) : (
								<div className="max-h-[300px] overflow-y-auto border rounded-md">
									<Table className="w-full text-left">
										<TableHeader className="sticky top-0 bg-background">
											<TableRow>
												<TableHead className="px-2 md:px-4 w-[80px]">
													選択
												</TableHead>
												<TableHead className="px-2 md:px-4">タイトル</TableHead>
												<TableHead className="hidden md:table-cell px-2 md:px-4">
													作成日
												</TableHead>
												<TableHead className="hidden md:table-cell px-2 md:px-4">
													更新日
												</TableHead>
												<TableHead className="hidden sm:table-cell px-2 md:px-4">
													カード数
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredAndSortedDecks.length === 0 ? (
												<TableRow>
													<TableCell
														colSpan={5}
														className="text-center py-4 text-muted-foreground"
													>
														デッキが見つかりません
													</TableCell>
												</TableRow>
											) : (
												filteredAndSortedDecks.map((deck) => (
													<TableRow key={deck.id}>
														<TableCell>
															<Checkbox
																checked={selectedDeckIds.includes(deck.id)}
																onCheckedChange={(checked) => {
																	if (checked) {
																		setSelectedDeckIds((prev) => [
																			...prev,
																			deck.id,
																		]);
																	} else {
																		setSelectedDeckIds((prev) =>
																			prev.filter((id) => id !== deck.id),
																		);
																	}
																}}
															/>
														</TableCell>
														<TableCell className="px-2 md:px-4">
															{deck.title}
														</TableCell>
														<TableCell className="hidden md:table-cell px-2 md:px-4">
															{new Date(deck.created_at).toLocaleDateString(
																"ja-JP",
															)}
														</TableCell>
														<TableCell className="hidden md:table-cell px-2 md:px-4">
															{deck.updated_at
																? new Date(deck.updated_at).toLocaleDateString(
																		"ja-JP",
																	)
																: "なし"}
														</TableCell>
														<TableCell className="hidden sm:table-cell px-2 md:px-4">
															{deck.card_count}
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</div>
							)}
							<div className="flex justify-end">
								<Button
									disabled={
										addGoalDeckLinkMutation.isPending ||
										selectedDeckIds.length === 0
									}
									onClick={handleAddSelected}
								>
									選択したデッキを追加
								</Button>
							</div>
							<div className="pt-4 border-t border-border">
								<Button
									variant="ghost"
									className="w-full"
									onClick={() => setIsCreatingNew(true)}
								>
									新しいデッキを作成する
								</Button>
							</div>
						</>
					)}
					{isCreatingNew && (
						<div className="space-y-4">
							<div className="flex items-center space-x-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setIsCreatingNew(false)}
									className="p-2"
								>
									<ArrowLeft className="h-4 w-4" />
								</Button>
								<h3 className="text-lg font-semibold">新しいデッキを作成</h3>
							</div>
							<Input
								placeholder="デッキのタイトルを入力"
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
									disabled={
										createDeckMutation.isPending ||
										addGoalDeckLinkMutation.isPending ||
										!newDeckTitle
									}
									onClick={handleCreate}
								>
									デッキを作成して追加
								</Button>
							</div>
						</div>
					)}
				</div>
			</ResponsiveDialog>
		</>
	);
}
