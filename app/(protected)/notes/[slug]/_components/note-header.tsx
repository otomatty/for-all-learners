"use client";

import { BookOpen, Clock, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
}: NoteHeaderProps) {
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
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

	return (
		<Card className="mb-4">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{slug}</CardDescription>
			</CardHeader>
			<CardContent>
				{description && (
					<p className="text-sm text-muted-foreground mb-2">{description}</p>
				)}
				<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
					<div className="flex items-center gap-1">
						<BookOpen className="h-4 w-4" />
						<span>ページ数: {pageCount}</span>
					</div>
					<div className="flex items-center gap-1">
						<Users className="h-4 w-4" />
						<span>参加者数: {participantCount}</span>
					</div>
					<div className="flex items-center gap-1">
						<Clock className="h-4 w-4" />
						<span>最終更新日: {formattedDate}</span>
					</div>
				</div>
			</CardContent>
			<div className="px-4 pb-4 flex justify-between items-center">
				<div className="flex gap-2">
					{currentUserId === ownerId && (
						<>
							{!isDefaultNote && (
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button variant="destructive" disabled={isDeleting}>
											<Trash2 className="h-4 w-4 mr-2" />
											削除
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
											<AlertDialogDescription>
												「{title}」を削除します。
												<br />
												この操作は取り消せません。ノートの共有設定は削除されますが、ページ自体は削除されません。
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>キャンセル</AlertDialogCancel>
											<AlertDialogAction
												onClick={async () => {
													setIsDeleting(true);
													try {
														await deleteNote(id);
														toast.success("ノートを削除しました");
														router.push("/notes");
													} catch (error) {
														toast.error(
															error instanceof Error
																? error.message
																: "ノートの削除に失敗しました。",
														);
														setIsDeleting(false);
													}
												}}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											>
												{isDeleting ? "削除中..." : "削除"}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							)}
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
						</>
					)}
				</div>
				<Badge variant={badgeVariant}>{visibilityLabel}</Badge>
			</div>
		</Card>
	);
}
