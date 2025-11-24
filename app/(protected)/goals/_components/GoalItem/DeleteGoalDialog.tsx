"use client";

import { useRouter } from "next/navigation";
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
import { useDeleteStudyGoal } from "@/hooks/study_goals/useDeleteStudyGoal";

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
	const deleteGoal = useDeleteStudyGoal();

	const handleDelete = () => {
		deleteGoal.mutate(goal.id, {
			onSuccess: () => {
				toast.success("目標を削除しました");
				router.refresh();
				onOpenChange(false);
			},
			onError: (error) => {
				toast.error(
					error instanceof Error ? error.message : "目標の削除に失敗しました",
				);
			},
		});
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
					<AlertDialogCancel disabled={deleteGoal.isPending}>
						キャンセル
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={deleteGoal.isPending}
						className="bg-red-600 hover:bg-red-700"
					>
						{deleteGoal.isPending ? "削除中..." : "削除"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
