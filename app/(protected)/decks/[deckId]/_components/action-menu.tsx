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
import { MoreHorizontal, Pencil, Trash2, Volume2, Camera } from "lucide-react";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { CardForm } from "../_components/card-form";
import { DeckForm } from "../../_components/deck-form";
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
		console.log("[ActionMenu] handleDelete called");
		try {
			await deleteDeck(deckId);
			toast.success("デッキを削除しました");
			router.push("/decks");
		} catch (err) {
			console.error("[ActionMenu] デッキ削除エラー:", err);
			toast.error("デッキの削除に失敗しました");
		} finally {
			console.log(
				"[ActionMenu] handleDelete finally block. Setting showDelete to false.",
			);
			setShowDelete(false);
		}
	};

	console.log("[ActionMenu] Rendering. Current states:", {
		deckId,
		showDelete,
		showCardFormDialog,
		showDeckFormDialog,
	});

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
					onOpenChange={(isOpen) => {
						console.log(
							"[ActionMenu] Mobile CardForm ResponsiveDialog onOpenChange:",
							isOpen,
						);
						setShowCardFormDialog(isOpen);
					}}
				>
					<CardForm deckId={deckId} userId={userId} />
				</ResponsiveDialog>
				<Button asChild variant="outline" size="sm">
					<Link href={`/decks/${deckId}/audio`}>
						<Volume2 className="h-4 w-4" />
						音読する
					</Link>
				</Button>
				<Button asChild variant="outline" size="sm">
					<Link href={`/decks/${deckId}/ocr`}>
						<Camera className="h-4 w-4" />
						画像を読み込む
					</Link>
				</Button>
				<ResponsiveDialog
					triggerText="編集"
					dialogTitle="デッキを編集"
					dialogDescription="デッキ情報を編集してください"
					triggerButtonProps={{ variant: "outline", size: "sm" }}
					open={showDeckFormDialog}
					onOpenChange={(isOpen) => {
						console.log(
							"[ActionMenu] Mobile DeckForm ResponsiveDialog onOpenChange:",
							isOpen,
						);
						setShowDeckFormDialog(isOpen);
					}}
				>
					<DeckForm
						userId={userId}
						deckId={deckId}
						initialTitle={deckTitle}
						initialDescription={deckDescription}
						initialIsPublic={deckIsPublic}
					/>
				</ResponsiveDialog>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						console.log(
							"[ActionMenu] Mobile Delete button clicked. Setting showDelete to true.",
						);
						setShowDelete(true);
					}}
				>
					<Trash2 className="h-4 w-4 text-destructive" />
					削除する
				</Button>
			</div>

			{/* Desktop: audio & OCR buttons + dropdown for other actions */}
			<div className="hidden md:flex justify-end mb-4 items-center space-x-2">
				<Button asChild size="sm">
					<Link href={`/decks/${deckId}/audio`}>
						<Volume2 className="h-4 w-4" />
						音読する
					</Link>
				</Button>
				<Button asChild size="sm">
					<Link href={`/decks/${deckId}/ocr`}>
						<Camera className="h-4 w-4" />
						画像を読み込む
					</Link>
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="icon">
							<MoreHorizontal className="h-4 w-4" />
							<span className="sr-only">アクション</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						onCloseAutoFocus={(e) => e.preventDefault()}
					>
						<DropdownMenuItem
							onSelect={() => {
								console.log(
									"[ActionMenu] Desktop '手動で入力する' onSelect. Setting showCardFormDialog to true.",
								);
								setTimeout(() => setShowCardFormDialog(true), 0);
							}}
						>
							手動で入力する
						</DropdownMenuItem>

						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={() => {
								console.log(
									"[ActionMenu] Desktop 'デッキを編集する' onSelect. Setting showDeckFormDialog to true.",
								);
								setTimeout(() => setShowDeckFormDialog(true), 0);
							}}
						>
							<Pencil className="h-4 w-4" />
							デッキを編集する
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={() => {
								console.log(
									"[ActionMenu] Desktop 'デッキを削除する' onSelect. Setting showDelete to true.",
								);
								setTimeout(() => setShowDelete(true), 0);
							}}
						>
							<Trash2 className="h-4 w-4 text-destructive" />
							<span className="text-destructive">デッキを削除する</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{/* Dialogs for Desktop Dropdown Menu */}
			<ResponsiveDialog
				open={showCardFormDialog}
				onOpenChange={(isOpen) => {
					console.log(
						"[ActionMenu] Desktop CardForm ResponsiveDialog onOpenChange:",
						isOpen,
					);
					setShowCardFormDialog(isOpen);
				}}
				dialogTitle="カードを作成 (Desktop)"
				dialogDescription="カードの表面（質問）と裏面（回答）を入力してください"
			>
				<CardForm
					deckId={deckId}
					userId={userId}
					onSuccess={() => setShowCardFormDialog(false)}
				/>
			</ResponsiveDialog>
			<ResponsiveDialog
				open={showDeckFormDialog}
				onOpenChange={(isOpen) => {
					console.log(
						"[ActionMenu] Desktop DeckForm ResponsiveDialog onOpenChange:",
						isOpen,
					);
					setShowDeckFormDialog(isOpen);
				}}
				dialogTitle="デッキを編集 (Desktop)"
				dialogDescription="デッキ情報を編集してください"
			>
				<DeckForm
					userId={userId}
					deckId={deckId}
					initialTitle={deckTitle}
					initialDescription={deckDescription}
					initialIsPublic={deckIsPublic}
					onSuccess={() => setShowDeckFormDialog(false)}
				/>
			</ResponsiveDialog>
			{/* Delete confirmation */}
			<AlertDialog
				open={showDelete}
				onOpenChange={(isOpen) => {
					console.log("[ActionMenu] Delete AlertDialog onOpenChange:", isOpen);
					setShowDelete(isOpen);
				}}
			>
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
