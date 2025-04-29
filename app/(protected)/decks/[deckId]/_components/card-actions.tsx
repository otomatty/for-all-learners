"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import { MoreHorizontal, Trash } from "lucide-react";

interface CardActionsProps {
	cardId: string;
	deckId: string;
}

export function CardActions({ cardId, deckId }: CardActionsProps) {
	const router = useRouter();
	const supabase = createClient();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const handleDelete = async () => {
		setIsLoading(true);

		try {
			// 問題バリエーションの削除
			await supabase.from("questions").delete().eq("card_id", cardId);

			// 学習記録の削除
			await supabase.from("learning_logs").delete().eq("card_id", cardId);

			// カードの削除
			const { error } = await supabase.from("cards").delete().eq("id", cardId);

			if (error) {
				throw error;
			}

			toast.success("カードを削除しました", {
				description: "カードとそれに関連するデータが削除されました。",
			});

			router.refresh();
		} catch (error) {
			toast.error("エラーが発生しました", {
				description:
					error instanceof Error
						? error.message
						: "カードの削除中にエラーが発生しました。",
			});
		} finally {
			setIsLoading(false);
			setShowDeleteDialog(false);
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon">
						<MoreHorizontal className="h-4 w-4" />
						<span className="sr-only">アクション</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onClick={() => setShowDeleteDialog(true)}
					>
						<Trash className="mr-2 h-4 w-4" />
						<span>削除</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>カードを削除しますか？</AlertDialogTitle>
						<AlertDialogDescription>
							この操作は元に戻せません。カードとそれに関連するすべてのデータが削除されます。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>キャンセル</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isLoading}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isLoading ? "削除中..." : "削除する"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
