"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { CardForm } from "../_components/card-form";
import { DeckForm } from "../../_components/deck-form";
import { SyncButton } from "../_components/sync-button";
import { deleteDeck } from "@/app/_actions/decks";
import { toast } from "sonner";

interface ActionMenuProps {
	deckId: string;
	userId: string;
	deckTitle: string;
	deckDescription: string;
	deckIsPublic: boolean;
}

export default function ActionMenu({
	deckId,
	userId,
	deckTitle,
	deckDescription,
	deckIsPublic,
}: ActionMenuProps) {
	const router = useRouter();
	const [showDelete, setShowDelete] = useState(false);
	const [showCardFormDialog, setShowCardFormDialog] = useState(false);
	const [showDeckFormDialog, setShowDeckFormDialog] = useState(false);

	const handleDelete = async () => {
		try {
			await deleteDeck(deckId);
			toast.success("デッキを削除しました");
			router.push("/decks");
		} catch (err) {
			console.error("デッキ削除エラー:", err);
			toast.error("デッキの削除に失敗しました");
		} finally {
			setShowDelete(false);
		}
	};

	return (
		<>
			{/* Mobile: show all buttons inline */}
			<div className="flex justify-end mb-4 space-x-2 md:hidden">
				<ResponsiveDialog
					triggerText="手動で入力する"
					dialogTitle="カードを作成"
					dialogDescription="カードの表面（質問）と裏面（回答）を入力してください"
					triggerButtonProps={{ variant: "outline", size: "sm" }}
					open={showCardFormDialog}
					onOpenChange={setShowCardFormDialog}
				>
					<CardForm deckId={deckId} userId={userId} />
				</ResponsiveDialog>
				<Button asChild variant="outline" size="sm">
					<Link href={`/decks/${deckId}/audio`}>音読する</Link>
				</Button>
				<Button asChild variant="outline" size="sm">
					<Link href={`/decks/${deckId}/ocr`}>画像を読み込む</Link>
				</Button>
				<SyncButton deckId={deckId} />
				<ResponsiveDialog
					triggerText="編集"
					dialogTitle="デッキを編集"
					dialogDescription="デッキ情報を編集してください"
					triggerButtonProps={{ variant: "outline", size: "sm" }}
					open={showDeckFormDialog}
					onOpenChange={setShowDeckFormDialog}
				>
					<DeckForm
						userId={userId}
						deckId={deckId}
						initialTitle={deckTitle}
						initialDescription={deckDescription}
						initialIsPublic={deckIsPublic}
					/>
				</ResponsiveDialog>
				<Button variant="outline" size="sm" onClick={() => setShowDelete(true)}>
					削除する
				</Button>
			</div>

			{/* Desktop: audio & OCR buttons + dropdown for other actions */}
			<div className="hidden md:flex justify-end mb-4 items-center space-x-2">
				<Button asChild variant="outline" size="sm">
					<Link href={`/decks/${deckId}/audio`}>音読する</Link>
				</Button>
				<Button asChild variant="outline" size="sm">
					<Link href={`/decks/${deckId}/ocr`}>画像を読み込む</Link>
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="icon">
							<MoreHorizontal className="h-4 w-4" />
							<span className="sr-only">アクション</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={() => setShowCardFormDialog(true)}>
							{/* ResponsiveDialogの内部トリガーは不要 */}
							手動で入力する
						</DropdownMenuItem>
						<DropdownMenuItem>
							<SyncButton deckId={deckId} />
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => setShowDeckFormDialog(true)}>
							{/* ResponsiveDialogの内部トリガーは不要 */}
							編集
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => setShowDelete(true)}>
							削除する
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Delete confirmation */}
			<AlertDialog open={showDelete} onOpenChange={setShowDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>デッキを削除しますか？</AlertDialogTitle>
						<AlertDialogDescription>
							この操作は元に戻せません。デッキとそれに関連するすべてのカードが削除されます。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>キャンセル</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							削除する
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
