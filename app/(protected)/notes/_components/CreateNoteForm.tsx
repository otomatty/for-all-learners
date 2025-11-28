"use client";

import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import type { CreateNotePayload } from "@/hooks/notes/useCreateNote";
import { useCreateNote } from "@/hooks/notes/useCreateNote";
import { useShareNote } from "@/hooks/notes/useShareNote";
import { createClient } from "@/lib/supabase/client";

interface CreateNoteFormProps {
	onSuccess: () => void;
}

export default function CreateNoteForm({ onSuccess }: CreateNoteFormProps) {
	const t = useTranslations("notes");
	const tCommon = useTranslations("common");
	const createNote = useCreateNote();
	const shareNote = useShareNote();
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
		const client = createClient();
		(async () => {
			try {
				const { count, error } = await client
					.from("notes")
					.select("id", { count: "exact", head: true })
					.eq("slug", slugValue);
				if (!isCurrent) return;
				if (error) {
					setSlugStatus("unavailable");
					return;
				}
				setSlugStatus(count === 0 ? "available" : "unavailable");
			} catch {
				if (isCurrent) setSlugStatus("unavailable");
			}
		})();
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
					}
				});
		}
	}, [step]);

	const onSubmit = async (data: CreateNotePayload) => {
		try {
			const note = await createNote.mutateAsync(data);
			setCreatedNoteId(note.id);
			setStep("share");
		} catch (_err) {
			// Error handling is done by the mutation
		}
	};

	return (
		<>
			{step === "form" && (
				<Form {...methods}>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
						<FormField
							name="title"
							control={methods.control}
							rules={{ required: t("form.titleRequired") }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("noteTitle")}</FormLabel>
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
								required: t("form.slugRequired"),
								validate: async (value: string) => {
									const { count, error } = await createClient()
										.from("notes")
										.select("id", { count: "exact", head: true })
										.eq("slug", value);
									if (error) return t("form.slugValidationError");
									return count === 0 || t("form.slugTaken");
								},
							}}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Slug</FormLabel>
									<FormDescription>{t("form.slugHint")}</FormDescription>
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
									<FormLabel>{t("noteDescription")}</FormLabel>
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
									<FormLabel>{t("visibility.label")}</FormLabel>
									<FormControl>
										<Select
											value={field.value}
											onValueChange={(value) => field.onChange(value)}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder={t("visibility.label")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="public">
													{t("visibility.public")}
												</SelectItem>
												<SelectItem value="unlisted">
													{t("visibility.unlisted")}
												</SelectItem>
												<SelectItem value="invite">
													{t("visibility.invite")}
												</SelectItem>
												<SelectItem value="private">
													{t("visibility.private")}
												</SelectItem>
											</SelectContent>
										</Select>
									</FormControl>
								</FormItem>
							)}
						/>
						<div className="flex justify-end">
							<Button
								type="submit"
								disabled={createNote.isPending || formState.isSubmitting}
							>
								{createNote.isPending ? t("form.creating") : t("form.create")}
							</Button>
						</div>
					</form>
				</Form>
			)}
			{step === "share" && (
				<Sheet defaultOpen>
					<SheetContent side="right">
						<SheetHeader>
							<SheetTitle>{t("share.title")}</SheetTitle>
							<SheetDescription>{t("share.description")}</SheetDescription>
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
								{tCommon("back")}
							</Button>
							<Button onClick={handleShare} disabled={isSharing}>
								{isSharing ? t("share.sharing") : t("share.shareButton")}
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
			await Promise.all(
				Array.from(selectedUserIds).map((userId) =>
					shareNote.mutateAsync({
						noteId: createdNoteId,
						userId,
						permission: "viewer",
					}),
				),
			);
			onSuccess();
		} catch (_err) {
			// Error handling is done by the mutation
		} finally {
			setIsSharing(false);
		}
	}
}
