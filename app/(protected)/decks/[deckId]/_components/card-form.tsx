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
// import { Textarea } from "@/components/ui/textarea"; // Textareaを削除
import TiptapEditor from "@/components/tiptap-editor"; // TiptapEditorをインポート
import { createCard } from "@/app/_actions/cards";

interface CardFormProps {
	deckId: string;
	userId: string;
	onSuccess?: () => void;
}

type CardFormValues = {
	frontContent: string; // TipTapのJSON文字列を期待
	backContent: string; // TipTapのJSON文字列を期待
};

// TipTapの空のドキュメントを表すJSON文字列
const emptyTiptapContent = JSON.stringify({ type: "doc", content: [] });

export function CardForm({ deckId, userId }: CardFormProps) {
	const router = useRouter();
	const form = useForm<CardFormValues>({
		defaultValues: {
			frontContent: emptyTiptapContent,
			backContent: emptyTiptapContent,
		},
	});
	const [side, setSide] = useState<"front" | "back">("front");
	const [isLoading, setIsLoading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

	const onSubmit = async (values: CardFormValues) => {
		setIsLoading(true);
		try {
			const { frontContent, backContent } = values;

			// TipTapのコンテンツが実質的に空かどうかの簡易チェック
			// TODO: より堅牢な空チェック方法を検討する (例: editor.isEmpty)
			const isFrontEmpty =
				!frontContent ||
				JSON.parse(frontContent).content.every(
					(node: { content?: { text?: string }[] }) =>
						!node.content ||
						node.content.every(
							(textNode: { text?: string }) => !textNode.text?.trim(),
						),
				);
			const isBackEmpty =
				!backContent ||
				JSON.parse(backContent).content.every(
					(node: { content?: { text?: string }[] }) =>
						!node.content ||
						node.content.every(
							(textNode: { text?: string }) => !textNode.text?.trim(),
						),
				);

			if (isFrontEmpty) {
				toast.error("表面に内容を入力してください");
				return;
			}
			if (isBackEmpty) {
				toast.error("裏面に内容を入力してください");
				return;
			}

			// Use server action to create a card
			const data = await createCard({
				user_id: userId,
				deck_id: deckId,
				front_content: frontContent, // TipTapのJSON文字列を渡す
				back_content: backContent, // TipTapのJSON文字列を渡す
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
		const frontJsonString = form.getValues("frontContent");
		let frontTextContent = "";
		try {
			const frontJson = JSON.parse(frontJsonString) as {
				content?: { content?: { text?: string }[] }[];
			};
			// 簡単なテキスト抽出ロジック (より複雑な構造に対応するには改善が必要)
			if (frontJson.content) {
				for (const node of frontJson.content) {
					if (node.content) {
						for (const textNode of node.content) {
							if (textNode.text) {
								frontTextContent = `${frontTextContent}${textNode.text} `;
							}
						}
					}
				}
			}
			frontTextContent = frontTextContent.trim();
		} catch (e) {
			console.error("フロントコンテンツのパースエラー:", e);
			toast.error("表面のコンテンツ形式が正しくありません。");
			return;
		}

		if (!frontTextContent) {
			toast.error("表面の内容を入力してください");
			return;
		}
		setIsGenerating(true);
		try {
			// 仮の回答生成ロジック (実際にはAI APIなどを呼び出す)
			// 生成されたテキストをTipTapのJSON形式に変換する必要がある
			setTimeout(() => {
				const generatedText = `「${frontTextContent}」に対する回答例:\n\n${frontTextContent}は、ITパスポート試験の重要な概念です。詳細な説明...`;
				// 生成されたプレーンテキストをTipTapの段落に変換
				const backTiptapJson = {
					type: "doc",
					content: generatedText.split("\n").map((paragraph) => ({
						type: "paragraph",
						content: paragraph ? [{ type: "text", text: paragraph }] : [],
					})),
				};
				form.setValue("backContent", JSON.stringify(backTiptapJson));
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
									<TiptapEditor
										content={field.value}
										onChange={field.onChange}
										placeholder="表面の内容を入力してください"
										userId={userId} // userIdを渡す
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
									<TiptapEditor
										content={field.value}
										onChange={field.onChange}
										placeholder="裏面の内容を入力してください"
										userId={userId} // userIdを渡す
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
