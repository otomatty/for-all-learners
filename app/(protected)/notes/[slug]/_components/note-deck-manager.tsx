"use client";

import { ExternalLink, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
	createNoteDeckLink,
	removeNoteDeckLink,
} from "@/app/_actions/note-deck-links";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Database } from "@/types/database.types";

type Deck = Database["public"]["Tables"]["decks"]["Row"];

interface NoteDeckManagerProps {
	noteId: string;
	linkedDecks: Deck[];
	availableDecks: Deck[];
}

export function NoteDeckManager({
	noteId,
	linkedDecks,
	availableDecks,
}: NoteDeckManagerProps) {
	const [isPending, startTransition] = useTransition();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deckToDelete, setDeckToDelete] = useState<string | null>(null);

	const filteredAvailableDecks = availableDecks.filter(
		(deck) =>
			deck.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			deck.description?.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const handleLinkDeck = (deckId: string) => {
		startTransition(async () => {
			try {
				await createNoteDeckLink({ note_id: noteId, deck_id: deckId });
				toast.success("デッキをリンクしました");
				setIsDialogOpen(false);
				setSearchTerm("");
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "リンクに失敗しました";
				toast.error(errorMessage);
			}
		});
	};

	const handleUnlinkDeck = (deckId: string) => {
		setDeckToDelete(deckId);
		setDeleteConfirmOpen(true);
	};

	const confirmUnlinkDeck = () => {
		if (!deckToDelete) return;

		startTransition(async () => {
			try {
				await removeNoteDeckLink(noteId, deckToDelete);
				toast.success("デッキのリンクを解除しました");
				setDeleteConfirmOpen(false);
				setDeckToDelete(null);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "リンク解除に失敗しました";
				toast.error(errorMessage);
			}
		});
	};

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-medium">リンクされたデッキ</h3>
			</div>

			{linkedDecks.length === 0 ? (
				<p className="text-center text-muted-foreground py-4 border border-dashed rounded-lg">
					リンクされたデッキがありません
				</p>
			) : (
				linkedDecks.map((deck) => (
					<div
						key={deck.id}
						className="flex items-center justify-between p-3 border border-border rounded-lg bg-background mb-0"
					>
						<div className="flex-1">
							<div className="flex items-center gap-2">
								<h4 className="font-medium">{deck.title}</h4>
								<Link
									href={`/decks/${deck.id}`}
									className="text-muted-foreground hover:text-foreground"
								>
									<ExternalLink className="w-4 h-4" />
								</Link>
								{deck.is_public && (
									<Badge variant="outline" className="text-xs">
										公開
									</Badge>
								)}
							</div>
							{deck.description && (
								<p className="text-sm text-muted-foreground mt-1">
									{deck.description}
								</p>
							)}
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleUnlinkDeck(deck.id)}
							disabled={isPending}
							className="text-muted-foreground hover:text-destructive"
						>
							<X className="w-4 h-4" />
						</Button>
					</div>
				))
			)}

			{/* デッキ追加ボタン - リスト下部に配置 */}
			<div className="flex justify-center pt-2">
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button
							disabled={isPending || availableDecks.length === 0}
							size="sm"
							variant="outline"
							className="w-full"
						>
							<Plus className="w-4 h-4 mr-2" />
							デッキを追加
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>デッキを選択</DialogTitle>
							<DialogDescription>
								このノートにリンクするデッキを選択してください
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
								<Input
									placeholder="デッキを検索..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>

							<div className="max-h-96 overflow-y-auto space-y-2">
								{filteredAvailableDecks.length === 0 ? (
									<p className="text-center text-muted-foreground py-4">
										{searchTerm
											? "検索条件に一致するデッキが見つかりません"
											: "利用可能なデッキがありません"}
									</p>
								) : (
									filteredAvailableDecks.map((deck) => (
										<div
											key={deck.id}
											className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:bg-muted/50"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<h4 className="font-medium">{deck.title}</h4>
													{deck.is_public && (
														<Badge variant="outline" className="text-xs">
															公開
														</Badge>
													)}
												</div>
												{deck.description && (
													<p className="text-sm text-muted-foreground mt-1">
														{deck.description}
													</p>
												)}
											</div>
											<Button
												onClick={() => handleLinkDeck(deck.id)}
												disabled={isPending}
												size="sm"
											>
												追加
											</Button>
										</div>
									))
								)}
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* 削除確認ダイアログ */}
			<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>デッキのリンクを解除しますか？</AlertDialogTitle>
						<AlertDialogDescription>
							この操作を実行すると、ノートとデッキの関連付けが解除されます。
							この操作は元に戻すことができます。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>
							キャンセル
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmUnlinkDeck}
							disabled={isPending}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							リンクを解除
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
