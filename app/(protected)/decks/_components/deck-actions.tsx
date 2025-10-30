"use client";

import { MoreHorizontal, Share2, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface DeckActionsProps {
	deckId: string;
}

export function DeckActions({ deckId }: DeckActionsProps) {
	const router = useRouter();
	const supabase = createClient();
	const [showShareDialog, setShowShareDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleShare = async () => {
		setIsLoading(true);

		try {
			if (!email.trim()) {
				throw new Error("メールアドレスを入力してください");
			}

			// 共有先ユーザーの存在確認
			const { data: userData, error: userError } = await supabase
				.from("accounts")
				.select("id")
				.eq("email", email)
				.single();

			if (userError || !userData) {
				throw new Error("指定されたメールアドレスのユーザーが見つかりません");
			}

			// 既に共有されているか確認
			const { data: existingShare } = await supabase
				.from("deck_shares")
				.select("id")
				.eq("deck_id", deckId)
				.eq("shared_with_user_id", userData.id)
				.single();

			if (existingShare) {
				throw new Error("このユーザーには既に共有されています");
			}

			// 共有情報を登録
			const { error: shareError } = await supabase.from("deck_shares").insert({
				deck_id: deckId,
				shared_with_user_id: userData.id,
				permission_level: "view", // デフォルトは閲覧のみ
			});

			if (shareError) {
				throw shareError;
			}

			toast.success(`${email}にデッキを共有しました。`);

			setEmail("");
			setShowShareDialog(false);
		} catch (_error) {
			toast.error("デッキの共有中にエラーが発生しました。");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = async () => {
		setIsLoading(true);

		try {
			// カードの削除
			await supabase.from("cards").delete().eq("deck_id", deckId);

			// 共有情報の削除
			await supabase.from("deck_shares").delete().eq("deck_id", deckId);

			// デッキの削除
			const { error } = await supabase.from("decks").delete().eq("id", deckId);

			if (error) {
				throw error;
			}

			toast.success("デッキを削除しました。");

			router.push("/decks");
		} catch (_error) {
			toast.error("デッキの削除中にエラーが発生しました。");
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
					<DropdownMenuItem onClick={() => setShowShareDialog(true)}>
						<Share2 className="mr-2 h-4 w-4" />
						<span>共有</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onClick={() => setShowDeleteDialog(true)}
					>
						<Trash className="mr-2 h-4 w-4" />
						<span>削除</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>デッキを共有</DialogTitle>
						<DialogDescription>
							メールアドレスを入力して、他のユーザーとデッキを共有します。
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="email">メールアドレス</Label>
							<Input
								id="email"
								placeholder="user@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowShareDialog(false)}>
							キャンセル
						</Button>
						<Button onClick={handleShare} disabled={isLoading}>
							{isLoading ? "共有中..." : "共有する"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
							disabled={isLoading}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{isLoading ? "削除中..." : "削除する"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
