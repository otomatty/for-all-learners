"use client";
import { addStudyGoal } from "@/app/_actions/study_goals";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
	const router = useRouter();
	const [internalOpen, setInternalOpen] = useState(false);
	const form = useForm<GoalFormFields>({
		defaultValues: { title: "", description: "", deadline: "" },
	});

	const isDialogOpen = open !== undefined ? open : internalOpen;
	const setIsDialogOpen =
		onOpenChange !== undefined ? onOpenChange : setInternalOpen;

	const onSubmit = async (data: GoalFormFields) => {
		await addStudyGoal(data);
		router.refresh();
		form.reset();
		setIsDialogOpen(false); // Close dialog on success
	};

	const triggerActualButtonProps = triggerButtonProps || {};
	const showTriggerButton = open === undefined; // Only show trigger if not controlled externally

	return (
		<>
			{showTriggerButton && (
				<Button
					{...triggerActualButtonProps}
					onClick={() => setIsDialogOpen(true)}
				>
					目標を追加する
				</Button>
			)}
			<ResponsiveDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				dialogTitle="学習目標を追加する"
			>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4 p-4"
					>
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
						<Button type="submit" className="mt-2">
							追加
						</Button>
					</form>
				</Form>
			</ResponsiveDialog>
		</>
	);
}
