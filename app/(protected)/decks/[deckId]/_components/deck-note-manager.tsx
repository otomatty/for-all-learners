"use client";

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
import { ExternalLink, FileText, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type Note = Database["public"]["Tables"]["notes"]["Row"];

interface DeckNoteManagerProps {
	deckId: string;
	linkedNotes: Note[];
	availableNotes: Note[];
}

export function DeckNoteManager({
	deckId,
	linkedNotes,
	availableNotes,
}: DeckNoteManagerProps) {
	const [isPending, startTransition] = useTransition();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

	const filteredAvailableNotes = availableNotes.filter(
		(note) =>
			note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			note.description?.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const handleLinkNote = (noteId: string) => {
		startTransition(async () => {
			try {
				await createNoteDeckLink({ note_id: noteId, deck_id: deckId });
				toast.success("ノートをリンクしました");
				setIsDialogOpen(false);
				setSearchTerm("");
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "リンクに失敗しました";
				toast.error(errorMessage);
			}
		});
	};

	const handleUnlinkNote = (noteId: string) => {
		setNoteToDelete(noteId);
		setDeleteConfirmOpen(true);
	};

	const confirmUnlinkNote = () => {
		if (!noteToDelete) return;

		startTransition(async () => {
			try {
				await removeNoteDeckLink(noteToDelete, deckId);
				toast.success("ノートのリンクを解除しました");
				setDeleteConfirmOpen(false);
				setNoteToDelete(null);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "リンク解除に失敗しました";
				toast.error(errorMessage);
			}
		});
	};

	const getVisibilityBadge = (visibility: string) => {
		switch (visibility) {
			case "public":
				return (
					<Badge variant="outline" className="text-xs">
						公開
					</Badge>
				);
			case "unlisted":
				return (
					<Badge variant="secondary" className="text-xs">
						限定公開
					</Badge>
				);
			case "private":
				return (
					<Badge variant="outline" className="text-xs">
						非公開
					</Badge>
				);
			default:
				return null;
		}
	};

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-medium">関連ノート</h3>
			</div>

			{linkedNotes.length === 0 ? (
				<p className="text-center text-muted-foreground py-4 border border-dashed rounded-lg">
					関連ノートがありません
				</p>
			) : (
				linkedNotes.map((note) => (
					<div
						key={note.id}
						className="flex items-center justify-between p-3 border border-border rounded-lg bg-background mb-0"
					>
						<div className="flex-1">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 text-muted-foreground" />
								<h4 className="font-medium">{note.title}</h4>
								<Link
									href={`/notes/${note.slug}`}
									className="text-muted-foreground hover:text-foreground"
								>
									<ExternalLink className="w-4 h-4" />
								</Link>
								{getVisibilityBadge(note.visibility)}
							</div>
							{note.description && (
								<p className="text-sm text-muted-foreground mt-1 ml-6">
									{note.description}
								</p>
							)}
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleUnlinkNote(note.id)}
							disabled={isPending}
							className="text-muted-foreground hover:text-destructive"
						>
							<X className="w-4 h-4" />
						</Button>
					</div>
				))
			)}

			{/* ノート追加ボタン - リスト下部に配置 */}
			<div className="flex justify-center pt-2">
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button
							disabled={isPending || availableNotes.length === 0}
							size="sm"
							variant="outline"
							className="w-full max-w-xs"
						>
							<Plus className="w-4 h-4 mr-2" />
							ノートを追加
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>ノートを選択</DialogTitle>
							<DialogDescription>
								このデッキにリンクするノートを選択してください
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
								<Input
									placeholder="ノートを検索..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>

							<div className="max-h-96 overflow-y-auto space-y-2">
								{filteredAvailableNotes.length === 0 ? (
									<p className="text-center text-muted-foreground py-4">
										{searchTerm
											? "検索条件に一致するノートが見つかりません"
											: "利用可能なノートがありません"}
									</p>
								) : (
									filteredAvailableNotes.map((note) => (
										<div
											key={note.id}
											className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<FileText className="w-4 h-4 text-muted-foreground" />
													<h4 className="font-medium">{note.title}</h4>
													{getVisibilityBadge(note.visibility)}
												</div>
												{note.description && (
													<p className="text-sm text-muted-foreground mt-1 ml-6">
														{note.description}
													</p>
												)}
											</div>
											<Button
												onClick={() => handleLinkNote(note.id)}
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
						<AlertDialogTitle>ノートのリンクを解除しますか？</AlertDialogTitle>
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
							onClick={confirmUnlinkNote}
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
