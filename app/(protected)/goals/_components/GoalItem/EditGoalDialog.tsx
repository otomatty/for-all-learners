"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useUpdateStudyGoal } from "@/hooks/study_goals/useUpdateStudyGoal";

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

interface GoalFormFields {
	title: string;
	description?: string;
	deadline?: string;
	status: "not_started" | "in_progress" | "completed";
	progress_rate: number;
}

interface EditGoalDialogProps {
	goal: StudyGoal;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EditGoalDialog({
	goal,
	open,
	onOpenChange,
}: EditGoalDialogProps) {
	const router = useRouter();
	const [submitError, setSubmitError] = useState<string>("");
	const updateGoal = useUpdateStudyGoal();

	const form = useForm<GoalFormFields>({
		defaultValues: {
			title: goal.title,
			description: goal.description || "",
			deadline: goal.deadline ? goal.deadline.split("T")[0] : "",
			status: goal.status,
			progress_rate: goal.progress_rate,
		},
	});

	// goalが変更されたらフォームをリセット
	useEffect(() => {
		if (open) {
			form.reset({
				title: goal.title,
				description: goal.description || "",
				deadline: goal.deadline ? goal.deadline.split("T")[0] : "",
				status: goal.status,
				progress_rate: goal.progress_rate,
			});
			setSubmitError("");
		}
	}, [goal, open, form]);

	const onSubmit = async (data: GoalFormFields) => {
		setSubmitError("");

		updateGoal.mutate(
			{
				goalId: goal.id,
				title: data.title,
				description: data.description,
				deadline: data.deadline,
				status: data.status,
				progressRate: data.progress_rate,
			},
			{
				onSuccess: () => {
					toast.success("目標を更新しました");
					router.refresh();
					onOpenChange(false);
				},
				onError: (error) => {
					const errorMessage =
						error instanceof Error ? error.message : "目標の更新に失敗しました";
					setSubmitError(errorMessage);
				},
			},
		);
	};

	const progressRate = form.watch("progress_rate");
	const status = form.watch("status");

	// 進捗率が100%になったら自動的にステータスを完了に
	useEffect(() => {
		if (progressRate === 100 && status !== "completed") {
			form.setValue("status", "completed");
		} else if (progressRate < 100 && status === "completed") {
			form.setValue("status", "in_progress");
		}
	}, [progressRate, status, form]);

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={onOpenChange}
			dialogTitle="目標を編集"
		>
			<div className="p-4 space-y-4">
				{/* エラーメッセージ */}
				{submitError && (
					<Alert variant="destructive">
						<AlertDescription>{submitError}</AlertDescription>
					</Alert>
				)}

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormItem>
							<FormLabel>タイトル</FormLabel>
							<FormControl>
								<Input
									{...form.register("title", {
										required: "タイトルは必須です",
									})}
									disabled={updateGoal.isPending}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>

						<FormItem>
							<FormLabel>説明</FormLabel>
							<FormControl>
								<Input
									{...form.register("description")}
									disabled={updateGoal.isPending}
								/>
							</FormControl>
						</FormItem>

						<FormItem>
							<FormLabel>期限</FormLabel>
							<FormControl>
								<Input
									type="date"
									{...form.register("deadline")}
									disabled={updateGoal.isPending}
								/>
							</FormControl>
						</FormItem>

						<FormItem>
							<FormLabel>ステータス</FormLabel>
							<Select
								value={status}
								onValueChange={(
									value: "not_started" | "in_progress" | "completed",
								) => form.setValue("status", value)}
								disabled={updateGoal.isPending}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="not_started">未開始</SelectItem>
									<SelectItem value="in_progress">進行中</SelectItem>
									<SelectItem value="completed">完了</SelectItem>
								</SelectContent>
							</Select>
						</FormItem>

						<FormItem>
							<FormLabel>進捗率: {progressRate}%</FormLabel>
							<FormControl>
								<Slider
									value={[progressRate]}
									onValueChange={(value) =>
										form.setValue("progress_rate", value[0])
									}
									max={100}
									min={0}
									step={5}
									className="w-full"
									disabled={updateGoal.isPending}
								/>
							</FormControl>
						</FormItem>

						{progressRate === 100 && (
							<Alert>
								<AlertDescription>
									進捗率が100%になったため、ステータスが自動的に「完了」に設定されます。
								</AlertDescription>
							</Alert>
						)}

						<div className="flex justify-end gap-2 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={updateGoal.isPending}
							>
								キャンセル
							</Button>
							<Button type="submit" disabled={updateGoal.isPending}>
								{updateGoal.isPending ? "更新中..." : "更新"}
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</ResponsiveDialog>
	);
}
