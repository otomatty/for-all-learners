"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	BookOpen,
	Calendar,
	CheckCircle2,
	Clock,
	MoreVertical,
	Play,
	Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { completeStudyGoal } from "@/app/_actions/study_goals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteGoalDialog } from "./delete-goal-dialog";
import { EditGoalDialog } from "./edit-goal-dialog";
import { GoalProgressBar } from "./goal-progress-bar";

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

interface GoalItemProps {
	goal: StudyGoal;
}

export function GoalItem({ goal }: GoalItemProps) {
	const router = useRouter();
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [isCompleting, setIsCompleting] = useState(false);

	const getStatusBadge = () => {
		switch (goal.status) {
			case "completed":
				return (
					<Badge
						variant="default"
						className="bg-green-100 text-green-800 hover:bg-green-100"
					>
						完了
					</Badge>
				);
			case "in_progress":
				return <Badge variant="secondary">進行中</Badge>;
			case "not_started":
				return <Badge variant="outline">未開始</Badge>;
			default:
				return <Badge variant="outline">未開始</Badge>;
		}
	};

	const handleComplete = async () => {
		setIsCompleting(true);
		try {
			const result = await completeStudyGoal(goal.id);
			if (result.success) {
				toast.success("目標を完了にしました");
				router.refresh();
			} else {
				toast.error(result.error);
			}
		} catch (error) {
			toast.error("目標の完了に失敗しました");
		} finally {
			setIsCompleting(false);
		}
	};

	const formatDate = (dateString: string) => {
		return format(new Date(dateString), "yyyy年MM月dd日", { locale: ja });
	};

	const isOverdue =
		goal.deadline &&
		new Date(goal.deadline) < new Date() &&
		goal.status !== "completed";

	return (
		<Card className="relative">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="text-lg">{goal.title}</CardTitle>
						{goal.description && (
							<p className="text-sm text-muted-foreground">
								{goal.description}
							</p>
						)}
					</div>
					<div className="flex items-center gap-2">
						{getStatusBadge()}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => setEditOpen(true)}>
									編集
								</DropdownMenuItem>
								{goal.status !== "completed" && (
									<DropdownMenuItem
										onClick={handleComplete}
										disabled={isCompleting}
									>
										<CheckCircle2 className="mr-2 h-4 w-4" />
										完了にする
									</DropdownMenuItem>
								)}
								<DropdownMenuItem
									onClick={() => setDeleteOpen(true)}
									className="text-red-600"
								>
									削除
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* 進捗バー */}
				<GoalProgressBar progress={goal.progress_rate} status={goal.status} />

				{/* メタ情報 */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
					<div className="flex items-center gap-2 text-muted-foreground">
						<Calendar className="h-4 w-4" />
						<span>作成: {formatDate(goal.created_at)}</span>
					</div>

					{goal.deadline && (
						<div
							className={`flex items-center gap-2 ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}
						>
							<Clock className="h-4 w-4" />
							<span>期限: {formatDate(goal.deadline)}</span>
							{isOverdue && <span className="text-xs">(期限切れ)</span>}
						</div>
					)}

					<div className="flex items-center gap-2 text-muted-foreground">
						<BookOpen className="h-4 w-4" />
						<span>デッキ: {goal.deckCount}個</span>
					</div>
				</div>

				{/* 完了情報 */}
				{goal.status === "completed" && goal.completed_at && (
					<div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
						<CheckCircle2 className="h-4 w-4" />
						<span>完了日: {formatDate(goal.completed_at)}</span>
					</div>
				)}

				{/* アクションボタン */}
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => router.push(`/dashboard?goalId=${goal.id}`)}
					>
						<Target className="mr-2 h-4 w-4" />
						ダッシュボードで表示
					</Button>
					{goal.status !== "completed" && (
						<Button
							size="sm"
							variant="default"
							onClick={() => router.push(`/learn?goalId=${goal.id}`)}
						>
							<Play className="mr-2 h-4 w-4" />
							学習開始
						</Button>
					)}
				</div>
			</CardContent>

			{/* ダイアログ */}
			<EditGoalDialog goal={goal} open={editOpen} onOpenChange={setEditOpen} />
			<DeleteGoalDialog
				goal={goal}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
			/>
		</Card>
	);
}
