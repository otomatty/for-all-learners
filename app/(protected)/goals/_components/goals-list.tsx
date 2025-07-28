"use client";

import { updateGoalsPriority } from "@/app/_actions/study_goals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { GoalItem } from "./goal-item";
import { SortableGoalItem } from "./sortable-goal-item";

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
	priority_order?: number;
}

interface GoalsListProps {
	goals: StudyGoal[];
}

type FilterStatus = "all" | "not_started" | "in_progress" | "completed";
type SortBy =
	| "priority_asc"
	| "created_desc"
	| "created_asc"
	| "deadline_asc"
	| "progress_desc";

export function GoalsList({ goals }: GoalsListProps) {
	const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
	const [sortBy, setSortBy] = useState<SortBy>("priority_asc");
	const [localGoals, setLocalGoals] = useState(goals);
	const [isPending, startTransition] = useTransition();
	const [isMounted, setIsMounted] = useState(false);

	// クライアントサイドでのマウント後にドラッグ&ドロップを有効化
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// propsのgoalsが更新された場合、localGoalsも同期
	useEffect(() => {
		setLocalGoals(goals);
	}, [goals]);

	// ドラッグセンサー設定
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// ドラッグ終了処理
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over || active.id === over.id) {
			return;
		}

		const oldIndex = localGoals.findIndex((goal) => goal.id === active.id);
		const newIndex = localGoals.findIndex((goal) => goal.id === over.id);

		if (oldIndex === -1 || newIndex === -1) {
			return;
		}

		// 配列の順序を変更
		const newGoals = [...localGoals];
		const [movedGoal] = newGoals.splice(oldIndex, 1);
		newGoals.splice(newIndex, 0, movedGoal);

		// 楽観的更新：priority_orderも更新してUIを即座に反映
		const updatedGoals = newGoals.map((goal, index) => ({
			...goal,
			priority_order: index + 1,
		}));
		setLocalGoals(updatedGoals);

		// サーバーに優先順位更新を送信（非同期）
		startTransition(async () => {
			const goalIds = updatedGoals.map((goal) => goal.id);
			const result = await updateGoalsPriority(goalIds);

			if (!result.success) {
				toast.error("優先順位の更新に失敗しました");
				// エラー時は元の状態に戻す
				setLocalGoals(goals);
			} else {
				toast.success("ゴールの優先順位を更新しました");
			}
		});
	};

	// フィルタリング用のゴールデータを選択
	const currentGoals = sortBy === "priority_asc" ? localGoals : goals;

	// フィルタリング
	const filteredGoals = currentGoals.filter((goal) => {
		if (filterStatus === "all") return true;
		return goal.status === filterStatus;
	});

	// ソート
	const sortedGoals = [...filteredGoals].sort((a, b) => {
		switch (sortBy) {
			case "priority_asc":
				return (a.priority_order || 999) - (b.priority_order || 999);
			case "created_desc":
				return (
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			case "created_asc":
				return (
					new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
				);
			case "deadline_asc":
				if (!a.deadline && !b.deadline) return 0;
				if (!a.deadline) return 1;
				if (!b.deadline) return -1;
				return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
			case "progress_desc":
				return b.progress_rate - a.progress_rate;
			default:
				return 0;
		}
	});

	// 統計情報
	const stats = {
		total: goals.length,
		notStarted: goals.filter((g) => g.status === "not_started").length,
		inProgress: goals.filter((g) => g.status === "in_progress").length,
		completed: goals.filter((g) => g.status === "completed").length,
	};

	if (goals.length === 0) {
		return (
			<div className="text-center py-12">
				<div className="max-w-sm mx-auto">
					<div className="mb-4">
						<div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
							<svg
								className="w-6 h-6 text-muted-foreground"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
								/>
							</svg>
						</div>
					</div>
					<h3 className="text-lg font-medium text-foreground">
						目標がありません
					</h3>
					<p className="text-muted-foreground mt-1">
						最初の学習目標を作成してみましょう。
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* 統計情報 */}
			<div className="flex flex-wrap gap-4">
				<div className="flex items-center gap-2">
					<Badge variant="outline">全体: {stats.total}</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-gray-600">
						未開始: {stats.notStarted}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="secondary">進行中: {stats.inProgress}</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Badge
						variant="default"
						className="bg-green-100 text-green-800 hover:bg-green-100"
					>
						完了: {stats.completed}
					</Badge>
				</div>
			</div>

			{/* フィルタとソート */}
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="flex flex-wrap gap-2">
					<Button
						variant={filterStatus === "all" ? "default" : "outline"}
						size="sm"
						onClick={() => setFilterStatus("all")}
					>
						すべて ({stats.total})
					</Button>
					<Button
						variant={filterStatus === "not_started" ? "default" : "outline"}
						size="sm"
						onClick={() => setFilterStatus("not_started")}
					>
						未開始 ({stats.notStarted})
					</Button>
					<Button
						variant={filterStatus === "in_progress" ? "default" : "outline"}
						size="sm"
						onClick={() => setFilterStatus("in_progress")}
					>
						進行中 ({stats.inProgress})
					</Button>
					<Button
						variant={filterStatus === "completed" ? "default" : "outline"}
						size="sm"
						onClick={() => setFilterStatus("completed")}
					>
						完了 ({stats.completed})
					</Button>
				</div>

				<Select
					value={sortBy}
					onValueChange={(value: SortBy) => setSortBy(value)}
				>
					<SelectTrigger className="w-[200px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="priority_asc">優先順位 (高い順)</SelectItem>
						<SelectItem value="created_desc">作成日 (新しい順)</SelectItem>
						<SelectItem value="created_asc">作成日 (古い順)</SelectItem>
						<SelectItem value="deadline_asc">期限 (近い順)</SelectItem>
						<SelectItem value="progress_desc">進捗率 (高い順)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* 目標一覧 */}
			{sortedGoals.length === 0 ? (
				<div className="text-center py-8">
					<p className="text-muted-foreground">
						選択した条件に一致する目標がありません。
					</p>
				</div>
			) : sortBy === "priority_asc" && isMounted ? (
				/* ドラッグ&ドロップ対応（優先順位ソート時のみ、クライアントサイドマウント後） */
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={sortedGoals.map((goal) => goal.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="grid gap-6">
							{sortedGoals.map((goal) => (
								<SortableGoalItem key={goal.id} goal={goal} />
							))}
						</div>
					</SortableContext>
				</DndContext>
			) : (
				/* 通常表示（他のソート時） */
				<div className="grid gap-6">
					{sortedGoals.map((goal) => (
						<GoalItem key={goal.id} goal={goal} />
					))}
				</div>
			)}

			{/* ローディング状態表示 */}
			{isPending && (
				<div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg">
					優先順位を更新中...
				</div>
			)}
		</div>
	);
}
