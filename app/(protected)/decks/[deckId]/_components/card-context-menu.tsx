"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/responsive-dialog"; // ResponsiveDialog をインポート
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
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types"; // Database 型をインポート
import { CardForm } from "./card-form"; // CardForm をインポート

interface CardContextMenuProps {
	card: Database["public"]["Tables"]["cards"]["Row"];
	deckId: string;
	userId: string | null;
	canEdit: boolean;
	onCardUpdated: (
		updatedCard: Database["public"]["Tables"]["cards"]["Row"],
	) => void; // カード更新通知用コールバック
	children: React.ReactNode;
}

export function CardContextMenu({
	card,
	deckId,
	userId,
	canEdit,
	onCardUpdated,
	children,
}: CardContextMenuProps) {
	const supabase = createClient();
	const router = useRouter();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	const handleDelete = async () => {
		const { error } = await supabase.from("cards").delete().eq("id", card.id);
		if (error) {
			toast.error(error.message || "削除に失敗しました");
		} else {
			toast.success("カードを削除しました");
			router.refresh();
		}
	};

	const handleEditSuccess = (
		updatedCard: Database["public"]["Tables"]["cards"]["Row"],
	) => {
		setIsEditDialogOpen(false);
		onCardUpdated(updatedCard); // 親コンポーネントに更新を通知
		// router.refresh(); // オプティミスティックアップデートが主なら不要になることも
	};

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
				<ContextMenuContent>
					{canEdit && (
						<>
							<ContextMenuItem onSelect={() => setIsEditDialogOpen(true)}>
								<Pencil className="h-4 w-4" />
								編集する
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onSelect={() => setIsDeleteDialogOpen(true)}>
								<Trash2 className="h-4 w-4 text-destructive" />
								<span className="text-destructive">削除する</span>
							</ContextMenuItem>
						</>
					)}
				</ContextMenuContent>
			</ContextMenu>
			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
						<AlertDialogDescription>
							この操作は元に戻せません。このカードを完全に削除します。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>キャンセル</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								await handleDelete();
								// handleDelete内でエラーが発生してもダイアログは閉じる
							}}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							削除する
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{canEdit && userId && (
				<ResponsiveDialog
					open={isEditDialogOpen}
					onOpenChange={setIsEditDialogOpen}
					dialogTitle="カードを編集"
					dialogDescription="カードの内容を編集します。"
				>
					<CardForm
						deckId={deckId}
						userId={userId}
						cardToEdit={card}
						onSuccess={handleEditSuccess}
						onCancel={() => setIsEditDialogOpen(false)}
					/>
				</ResponsiveDialog>
			)}
		</>
	);
}
