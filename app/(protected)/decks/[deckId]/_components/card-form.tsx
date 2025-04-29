"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import type { JSONContent } from "@tiptap/core";

interface CardFormProps {
	deckId: string;
	userId: string;
}

type CardFormValues = {
	frontContent: JSONContent;
	backContent: JSONContent;
};

export function CardForm({ deckId, userId }: CardFormProps) {
	const router = useRouter();
	const supabase = createClient();
	const form = useForm<CardFormValues>({
		defaultValues: {
			frontContent: { type: "doc", content: [] },
			backContent: { type: "doc", content: [] },
		},
	});
	const [side, setSide] = useState<"front" | "back">("front");
	const [isLoading, setIsLoading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const frontEditor = useEditor({
		extensions: [
			StarterKit,
			LinkExtension.configure({
				HTMLAttributes: { className: "text-blue-500 underline" },
			}),
			PageLink,
		],
		content: form.getValues("frontContent"),
		onUpdate: ({ editor }) => form.setValue("frontContent", editor.getJSON()),
	});
	const backEditor = useEditor({
		extensions: [
			StarterKit,
			LinkExtension.configure({
				HTMLAttributes: { className: "text-blue-500 underline" },
			}),
			PageLink,
		],
		content: form.getValues("backContent"),
		onUpdate: ({ editor }) => form.setValue("backContent", editor.getJSON()),
	});

	const onSubmit = async (values: CardFormValues) => {
		setIsLoading(true);
		try {
			const { frontContent, backContent } = values;
			if (!frontContent.content?.length) {
				toast.error("表面に少なくとも1文字以上入力してください");
				return;
			}
			if (!backContent.content?.length) {
				toast.error("裏面に少なくとも1文字以上入力してください");
				return;
			}
			const { data, error } = await supabase
				.from("cards")
				.insert({
					user_id: userId,
					deck_id: deckId,
					front_content: frontContent,
					back_content: backContent,
				})
				.select()
				.single();
			if (error) {
				toast.error(error.message || "カードの作成に失敗しました");
				return;
			}
			toast.success("カードを作成しました");
			router.push(`/decks/${deckId}`);
		} catch (err: any) {
			console.error("カード作成エラー:", err);
			toast.error(err.message || "カードの作成中にエラーが発生しました。");
		} finally {
			setIsLoading(false);
		}
	};

	const generateAnswer = async () => {
		const frontJSON = frontEditor?.getJSON();
		if (!frontJSON?.content?.length) {
			toast.error("表面の内容を入力してください");
			return;
		}
		setIsGenerating(true);
		try {
			setTimeout(() => {
				const firstNode = frontJSON.content[0];
				const text = firstNode.type === "text" ? firstNode.text : "";
				const generatedText = `「${text}」に対する回答例:\n\n${text}は、ITパスポート試験の重要な概念です。詳細な説明...`;
				const generatedJSON: JSONContent = {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [{ type: "text", text: generatedText }],
						},
					],
				};
				form.setValue("backContent", generatedJSON);
				toast.success("回答を生成しました");
				setIsGenerating(false);
			}, 2000);
		} catch (err: any) {
			console.error("回答生成エラー:", err);
			toast.error(err.message || "回答生成中にエラーが発生しました。");
			setIsGenerating(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<Card>
					<CardContent>
						<div className="flex space-x-2 mb-4">
							<Button
								variant={side === "front" ? "default" : "outline"}
								size="sm"
								type="button"
								onClick={() => setSide("front")}
							>
								表面
							</Button>
							<Button
								variant={side === "back" ? "default" : "outline"}
								size="sm"
								type="button"
								onClick={() => setSide("back")}
							>
								裏面
							</Button>
						</div>
						{side === "front" && (
							<FormField
								name="frontContent"
								control={form.control}
								render={() => (
									<FormItem>
										<FormLabel>表面（問題・用語など）</FormLabel>
										<FormControl>
											{frontEditor && (
												<EditorContent
													editor={frontEditor}
													className="min-h-[100px] border p-2 rounded"
												/>
											)}
										</FormControl>
									</FormItem>
								)}
							/>
						)}
						{side === "back" && (
							<FormField
								name="backContent"
								control={form.control}
								render={() => (
									<FormItem>
										<FormLabel>裏面（回答・解説など）</FormLabel>
										<div className="mb-2">
											<Button
												variant="outline"
												size="sm"
												type="button"
												onClick={generateAnswer}
												disabled={isGenerating}
											>
												{isGenerating ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														生成中...
													</>
												) : (
													"回答を生成する"
												)}
											</Button>
										</div>
										<FormControl>
											{backEditor && (
												<EditorContent
													editor={backEditor}
													className="min-h-[150px] border p-2 rounded"
												/>
											)}
										</FormControl>
									</FormItem>
								)}
							/>
						)}
					</CardContent>
					<CardFooter className="flex justify-end space-x-2">
						<Button
							variant="outline"
							type="button"
							onClick={() => router.push(`/decks/${deckId}`)}
						>
							キャンセル
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "作成中..." : "カードを作成"}
						</Button>
					</CardFooter>
				</Card>
			</form>
		</Form>
	);
}
