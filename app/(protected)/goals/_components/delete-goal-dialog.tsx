"use client";

import { deleteStudyGoal } from "@/app/_actions/study_goals";
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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface StudyGoal {
	id: string;
	title: string;
	description?: string | null;
	deadline?: string | null;
	progress_rate: number;
	status: "not_started" | "in_progress" | "completed";
	created_at: string;
	completed_at?: string | null;
	deckCount: number;
}

interface DeleteGoalDialogProps {
	goal: StudyGoal;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteGoalDialog({
	goal,
	open,
	onOpenChange,
}: DeleteGoalDialogProps) {
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const result = await deleteStudyGoal(goal.id);
			if (result.success) {
				toast.success("目標を削除しました");
				router.refresh();
				onOpenChange(false);
			} else {
				toast.error(result.error);
			}
		} catch (error) {
			toast.error("目標の削除に失敗しました");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>目標を削除しますか？</AlertDialogTitle>
					<AlertDialogDescription>
						<strong>「{goal.title}」</strong>を削除します。
						<br />
						この操作は元に戻せません。目標に関連付けられたデッキとの紐付けも削除されます。
						{goal.deckCount > 0 && (
							<>
								<br />
								<br />
								<span className="text-amber-600">
									この目標には{goal.deckCount}個のデッキが関連付けられています。
								</span>
							</>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>
						キャンセル
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isDeleting}
						className="bg-red-600 hover:bg-red-700"
					>
						{isDeleting ? "削除中..." : "削除"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
