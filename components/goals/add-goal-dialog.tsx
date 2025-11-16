"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateStudyGoal, useGoalLimits } from "@/hooks/study_goals";

interface GoalFormFields {
	title: string;
	description?: string;
	deadline?: string;
}

export interface AddGoalDialogProps {
	triggerButtonProps?: React.ComponentProps<
		typeof import("@/components/ui/button").Button
	>;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function AddGoalDialog({
	triggerButtonProps,
	open,
	onOpenChange,
}: AddGoalDialogProps) {
	const [internalOpen, setInternalOpen] = React.useState(false);
	const [submitError, setSubmitError] = React.useState<string>("");
	const form = useForm<GoalFormFields>({
		defaultValues: { title: "", description: "", deadline: "" },
	});

	const isDialogOpen = open !== undefined ? open : internalOpen;
	const setIsDialogOpen =
		onOpenChange !== undefined ? onOpenChange : setInternalOpen;

	// カスタムフックを使用
	const { data: goalLimits } = useGoalLimits();
	const createGoal = useCreateStudyGoal();

	// ダイアログが開かれるたびにエラーをクリア
	useEffect(() => {
		if (isDialogOpen) {
			setSubmitError("");
		}
	}, [isDialogOpen]);

	const onSubmit = async (data: GoalFormFields) => {
		setSubmitError("");
		createGoal.mutate(data, {
			onSuccess: (result) => {
				if (result.success) {
					form.reset();
					setIsDialogOpen(false);
				} else {
					setSubmitError(result.error);
				}
			},
			onError: (error) => {
				setSubmitError(error.message || "目標の追加に失敗しました");
			},
		});
	};

	const triggerActualButtonProps = triggerButtonProps || {};
	const showTriggerButton = open === undefined; // Only show trigger if not controlled externally

	return (
		<>
			{showTriggerButton && (
				<div className="space-y-2">
					<Button
						{...triggerActualButtonProps}
						onClick={() => setIsDialogOpen(true)}
						disabled={goalLimits ? !goalLimits.canAddMore : false}
					>
						{goalLimits && !goalLimits.canAddMore
							? `目標上限に達しています (${goalLimits.currentCount}/${goalLimits.maxGoals})`
							: "目標を追加する"}
					</Button>
					{goalLimits && !goalLimits.isPaid && !goalLimits.canAddMore && (
						<p className="text-xs text-muted-foreground">
							有料プランにアップグレードして10個まで設定する
						</p>
					)}
				</div>
			)}
			<ResponsiveDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				dialogTitle="学習目標を追加する"
			>
				<div className="p-4 space-y-4">
					{/* 目標制限の表示 */}
					{goalLimits && (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm text-muted-foreground">
								<span>目標数</span>
								<div className="flex items-center gap-2">
									<Badge variant={goalLimits.isPaid ? "default" : "secondary"}>
										{goalLimits.isPaid ? "有料プラン" : "無料プラン"}
									</Badge>
									<span>
										{goalLimits.currentCount} / {goalLimits.maxGoals}
									</span>
								</div>
							</div>

							{!goalLimits.canAddMore && (
								<Alert>
									<AlertDescription>
										{goalLimits.isPaid
											? "有料プランの目標上限（10個）に達しています。"
											: "無料プランの目標上限（3個）に達しています。有料プランにアップグレードすると10個まで設定できます。"}
									</AlertDescription>
								</Alert>
							)}

							{!goalLimits.isPaid &&
								goalLimits.canAddMore &&
								goalLimits.remainingGoals <= 1 && (
									<Alert>
										<AlertDescription>
											あと{goalLimits.remainingGoals}
											個の目標を追加できます。有料プランでは10個まで設定可能です。
										</AlertDescription>
									</Alert>
								)}
						</div>
					)}

					{/* エラーメッセージの表示 */}
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
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
							<FormItem>
								<FormLabel>説明</FormLabel>
								<FormControl>
									<Input {...form.register("description")} />
								</FormControl>
							</FormItem>
							<FormItem>
								<FormLabel>期限</FormLabel>
								<FormControl>
									<Input type="date" {...form.register("deadline")} />
								</FormControl>
							</FormItem>
							<Button
								type="submit"
								className="mt-2"
								disabled={
									(goalLimits ? !goalLimits.canAddMore : false) ||
									createGoal.isPending
								}
							>
								{createGoal.isPending ? "追加中..." : "追加"}
							</Button>
						</form>
					</Form>
				</div>
			</ResponsiveDialog>
		</>
	);
}
