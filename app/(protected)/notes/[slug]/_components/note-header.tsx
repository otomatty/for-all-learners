"use client";

import {
	BookOpen,
	Clock,
	Link as LinkIcon,
	MoreVertical,
	Share2,
	Trash2,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { deleteNote } from "@/app/_actions/notes";
import { ShareSettingsModal } from "@/components/ShareSettingsModal";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

interface NoteHeaderProps {
	id: string;
	title: string;
	slug: string;
	description: string | null;
	visibility: "public" | "unlisted" | "invite" | "private";
	pageCount: number;
	participantCount: number;
	updatedAt: string;
	ownerId: string;
	isDefaultNote: boolean;
	onOpenDeckDialog?: () => void;
}

export default function NoteHeader({
	id,
	title,
	slug,
	description,
	visibility,
	pageCount,
	participantCount,
	updatedAt,
	ownerId,
	isDefaultNote,
	onOpenDeckDialog,
}: NoteHeaderProps) {
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const shareModalId = useId();
	const router = useRouter();

	useEffect(() => {
		const supabase = createClient();
		async function fetchUser() {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();
			if (!error && user) {
				setCurrentUserId(user.id);
			}
		}
		fetchUser();
	}, []);

	const formattedDate = new Date(updatedAt).toLocaleDateString("ja-JP");
	const visibilityLabel =
		visibility === "public"
			? "公開"
			: visibility === "unlisted"
				? "限定公開"
				: visibility === "invite"
					? "招待"
					: "非公開";
	const badgeVariant =
		visibility === "public"
			? "secondary"
			: visibility === "unlisted"
				? "outline"
				: visibility === "invite"
					? "default"
					: "destructive";

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteNote(id);
			toast.success("ノートを削除しました");
			router.push("/notes");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "ノートの削除に失敗しました。",
			);
			setIsDeleting(false);
		}
	};

	return (
		<>
			<header className="flex items-center justify-between py-4 border-b mb-4">
				<h1 className="text-2xl font-bold">{title}</h1>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon">
							<MoreVertical className="h-5 w-5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-80">
						<DropdownMenuLabel>ノート情報</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<div className="p-3 space-y-2 text-sm">
							<div>
								<span className="font-medium text-muted-foreground">
									スラッグ:
								</span>{" "}
								<span className="text-foreground">{slug}</span>
							</div>
							{description && (
								<div>
									<span className="font-medium text-muted-foreground">
										説明:
									</span>{" "}
									<p className="text-foreground mt-1">{description}</p>
								</div>
							)}
							<div className="flex items-center gap-2">
								<BookOpen className="h-4 w-4 text-muted-foreground" />
								<span>ページ数: {pageCount}</span>
							</div>
							<div className="flex items-center gap-2">
								<Users className="h-4 w-4 text-muted-foreground" />
								<span>参加者数: {participantCount}</span>
							</div>
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<span>最終更新日: {formattedDate}</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="font-medium text-muted-foreground">
									公開状態:
								</span>
								<Badge variant={badgeVariant}>{visibilityLabel}</Badge>
							</div>
						</div>

						{currentUserId === ownerId && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuLabel>アクション</DropdownMenuLabel>
								<DropdownMenuItem
									onClick={() => {
										const button = document.querySelector(
											`#${CSS.escape(shareModalId)} button`,
										) as HTMLButtonElement;
										button?.click();
									}}
								>
									<Share2 className="mr-2 h-4 w-4" />
									共有設定
								</DropdownMenuItem>
								{onOpenDeckDialog && (
									<DropdownMenuItem onClick={onOpenDeckDialog}>
										<LinkIcon className="mr-2 h-4 w-4" />
										リンクされたデッキ
									</DropdownMenuItem>
								)}
								{!isDefaultNote && (
									<DropdownMenuItem
										onClick={() => setShowDeleteDialog(true)}
										variant="destructive"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										削除
									</DropdownMenuItem>
								)}
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			{/* 共有設定モーダル - 非表示のトリガー */}
			{currentUserId === ownerId && (
				<div className="hidden">
					<div id={shareModalId}>
						<ShareSettingsModal
							note={{
								id,
								title,
								slug,
								description,
								visibility,
								pageCount,
								participantCount,
								updatedAt,
								ownerId,
							}}
						/>
					</div>
				</div>
			)}

			{/* 削除確認ダイアログ */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>本当に削除しますか?</AlertDialogTitle>
						<AlertDialogDescription>
							「{title}」を削除します。
							<br />
							この操作は取り消せません。ノートの共有設定は削除されますが、ページ自体は削除されません。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>キャンセル</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "削除中..." : "削除"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
