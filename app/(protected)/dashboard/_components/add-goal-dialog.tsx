"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
	Form,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { addStudyGoal } from "@/app/_actions/study_goals";

interface GoalFormFields {
	title: string;
	description?: string;
	deadline?: string;
}

export function AddGoalDialog() {
	const router = useRouter();
	const form = useForm<GoalFormFields>({
		defaultValues: { title: "", description: "", deadline: "" },
	});

	const onSubmit = async (data: GoalFormFields) => {
		await addStudyGoal(data);
		router.refresh();
		form.reset();
	};

	return (
		<ResponsiveDialog triggerText="目標を追加" dialogTitle="学習目標を追加">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
					<FormItem>
						<FormLabel>タイトル</FormLabel>
						<FormControl>
							<Input
								{...form.register("title", { required: "タイトルは必須です" })}
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
	);
}
