"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage, // FormMessageを追加
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea"; // Textareaを追加
import { createCard } from "@/app/_actions/cards";

interface CardFormProps {
	deckId: string;
	userId: string;
}

type CardFormValues = {
	frontContent: string; // 型をstringに変更
	backContent: string; // 型をstringに変更
};

export function CardForm({ deckId, userId }: CardFormProps) {
	const router = useRouter();
	const form = useForm<CardFormValues>({
		defaultValues: {
			frontContent: "", // 初期値を空文字列に変更
			backContent: "", // 初期値を空文字列に変更
		},
	});
	const [side, setSide] = useState<"front" | "back">("front");
	const [isLoading, setIsLoading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

	const onSubmit = async (values: CardFormValues) => {
		setIsLoading(true);
		try {
			const { frontContent, backContent } = values;
			if (!frontContent.trim()) {
				// 文字列の長さをチェック
				toast.error("表面に少なくとも1文字以上入力してください");
				return;
			}
			if (!backContent.trim()) {
				// 文字列の長さをチェック
				toast.error("裏面に少なくとも1文字以上入力してください");
				return;
			}
			// Use server action to create a card
			const data = await createCard({
				user_id: userId,
				deck_id: deckId,
				front_content: frontContent, // 文字列を渡す
				back_content: backContent, // 文字列を渡す
			});
			// syncCardLinksはTiptapのJSONContentを前提としているため削除
			// try {
			// 	await syncCardLinks(data.id, frontContent);
			// } catch (syncErr) {
			// 	console.error("リンク同期エラー:", syncErr);
			// }
			toast.success("カードを作成しました");
			router.push(`/decks/${deckId}`);
		} catch (err: unknown) {
			console.error("カード作成エラー:", err);
			toast.error(
				err instanceof Error
					? err.message
					: "カードの作成中にエラーが発生しました。",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const generateAnswer = async () => {
		const frontText = form.getValues("frontContent").trim(); // 文字列として取得
		if (!frontText) {
			toast.error("表面の内容を入力してください");
			return;
		}
		setIsGenerating(true);
		try {
			setTimeout(() => {
				const generatedText = `「${frontText}」に対する回答例:\n\n${frontText}は、ITパスポート試験の重要な概念です。詳細な説明...`;
				form.setValue("backContent", generatedText); // 文字列として設定
				toast.success("回答を生成しました");
				setIsGenerating(false);
			}, 2000);
		} catch (err: unknown) {
			console.error("回答生成エラー:", err);
			toast.error(
				err instanceof Error
					? err.message
					: "回答生成中にエラーが発生しました。",
			);
			setIsGenerating(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
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
						control={form.control}
						name="frontContent"
						render={({ field }) => (
							<FormItem>
								<FormLabel>表面（問題・用語など）</FormLabel>
								<FormControl>
									<Textarea
										placeholder="表面の内容を入力してください" // placeholderを追加
										className="min-h-[100px] border p-2 rounded"
										{...field} // fieldプロップスを渡す
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				{side === "back" && (
					<FormField
						control={form.control}
						name="backContent"
						render={({ field }) => (
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
									<Textarea
										placeholder="裏面の内容を入力してください" // placeholderを追加
										className="min-h-[150px] border p-2 rounded"
										{...field} // fieldプロップスを渡す
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
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
			</form>
		</Form>
	);
}
