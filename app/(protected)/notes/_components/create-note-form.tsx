"use client";

import { type CreateNotePayload, createNote } from "@/app/_actions/notes";
import { shareNote } from "@/app/_actions/notes";
import { validateSlug } from "@/app/_actions/slug";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, X } from "lucide-react";
import React, { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";

interface CreateNoteFormProps {
	onSuccess: () => void;
}

export default function CreateNoteForm({ onSuccess }: CreateNoteFormProps) {
	const [isPending, startTransition] = useTransition();
	const methods = useForm<CreateNotePayload>({
		defaultValues: {
			title: "",
			slug: "",
			description: "",
			visibility: "private",
		},
	});
	const { handleSubmit, formState } = methods;
	const slugValue = methods.watch("slug");
	const [slugStatus, setSlugStatus] = useState<
		"idle" | "validating" | "available" | "unavailable"
	>("idle");
	const [step, setStep] = useState<"form" | "share">("form");
	const [createdNoteId, setCreatedNoteId] = useState<string>("");
	const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
	const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
		new Set(),
	);
	const [isSharing, setIsSharing] = useState(false);

	useEffect(() => {
		if (!slugValue) {
			setSlugStatus("idle");
			return;
		}
		let isCurrent = true;
		setSlugStatus("validating");
		validateSlug(slugValue)
			.then(({ available }) => {
				if (!isCurrent) return;
				setSlugStatus(available ? "available" : "unavailable");
			})
			.catch(() => {
				if (isCurrent) setSlugStatus("unavailable");
			});
		return () => {
			isCurrent = false;
		};
	}, [slugValue]);

	useEffect(() => {
		if (step === "share") {
			const client = createClient();
			client
				.from("accounts")
				.select("id, email")
				.then(({ data, error }) => {
					if (!error && data) {
						setUsers(data as { id: string; email: string }[]);
					} else {
						console.error("ユーザーリスト取得エラー:", error);
					}
				});
		}
	}, [step]);

	const onSubmit = (data: CreateNotePayload) => {
		startTransition(async () => {
			try {
				const note = await createNote(data);
				setCreatedNoteId(note.id);
				setStep("share");
			} catch (err) {
				console.error("ノート作成エラー:", err);
			}
		});
	};

	return (
		<>
			{step === "form" && (
				<Form {...methods}>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
						<FormField
							name="title"
							control={methods.control}
							rules={{ required: "タイトルは必須です" }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>タイトル</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							name="slug"
							control={methods.control}
							rules={{
								required: "Slugは必須です",
								validate: async (value: string) => {
									const { count, error } = await createClient()
										.from("notes")
										.select("id", { count: "exact", head: true })
										.eq("slug", value);
									if (error) return "Slugの確認中にエラーが発生しました";
									return count === 0 || "Slugは既に使用されています";
								},
							}}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Slug</FormLabel>
									<FormDescription>
										英数字とハイフンのみを使用してください
									</FormDescription>
									<FormControl>
										<div className="relative">
											<Input
												{...field}
												className={
													slugStatus === "available"
														? "border-green-500"
														: slugStatus === "unavailable"
															? "border-red-500"
															: ""
												}
											/>
											{slugStatus === "validating" && (
												<Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin" />
											)}
											{slugStatus === "available" && (
												<Check className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500" />
											)}
											{slugStatus === "unavailable" && (
												<X className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500" />
											)}
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							name="description"
							control={methods.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>説明</FormLabel>
									<FormControl>
										<Textarea {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							name="visibility"
							control={methods.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>公開範囲</FormLabel>
									<FormControl>
										<Select
											value={field.value}
											onValueChange={(value) => field.onChange(value)}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="公開範囲" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="public">公開</SelectItem>
												<SelectItem value="unlisted">限定公開</SelectItem>
												<SelectItem value="invite">招待制</SelectItem>
												<SelectItem value="private">非公開</SelectItem>
											</SelectContent>
										</Select>
									</FormControl>
								</FormItem>
							)}
						/>
						<div className="flex justify-end">
							<Button
								type="submit"
								disabled={isPending || formState.isSubmitting}
							>
								{isPending ? "作成中…" : "作成"}
							</Button>
						</div>
					</form>
				</Form>
			)}
			{step === "share" && (
				<Sheet defaultOpen>
					<SheetContent side="right">
						<SheetHeader>
							<SheetTitle>ノートを共有</SheetTitle>
							<SheetDescription>
								共有するユーザーを選択してください。
							</SheetDescription>
						</SheetHeader>
						<div className="overflow-y-auto flex-1 p-4 space-y-2">
							{users.map((user) => (
								<div key={user.id} className="flex items-center">
									<Checkbox
										id={user.id}
										checked={selectedUserIds.has(user.id)}
										onCheckedChange={(checked) => {
											setSelectedUserIds((prev) => {
												const next = new Set(prev);
												if (checked) next.add(user.id);
												else next.delete(user.id);
												return next;
											});
										}}
									/>
									<Label htmlFor={user.id} className="ml-2">
										{user.email}
									</Label>
								</div>
							))}
						</div>
						<SheetFooter>
							<Button variant="outline" onClick={() => setStep("form")}>
								戻る
							</Button>
							<Button onClick={handleShare} disabled={isSharing}>
								{isSharing ? "共有中..." : "共有する"}
							</Button>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			)}
		</>
	);

	async function handleShare() {
		setIsSharing(true);
		try {
			for (const userId of selectedUserIds) {
				await shareNote(createdNoteId, userId, "viewer");
			}
			onSuccess();
		} catch (err) {
			console.error("ノート共有エラー:", err);
		} finally {
			setIsSharing(false);
		}
	}
}
