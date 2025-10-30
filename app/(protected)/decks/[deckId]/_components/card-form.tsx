"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createCard, updateCard } from "@/app/_actions/cards"; // updateCard をインポート
import TiptapEditor from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import logger from "@/lib/logger";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage, // FormMessageを追加
} from "@/components/ui/form";
import type { Database } from "@/types/database.types"; // Database 型をインポート

interface CardFormProps {
	deckId: string;
	userId: string;
	cardToEdit?: Database["public"]["Tables"]["cards"]["Row"]; // 編集対象のカード情報
	onSuccess?: (card: Database["public"]["Tables"]["cards"]["Row"]) => void; // 作成または更新されたカードを受け取る
	onCancel?: () => void; // キャンセル時のコールバック
}

type CardFormValues = {
	frontContent: string; // TipTapのJSON文字列を期待
	backContent: string; // TipTapのJSON文字列を期待
};

// TipTapの空のドキュメントを表すJSON文字列
const emptyTiptapContent = JSON.stringify({ type: "doc", content: [] });

export function CardForm({
	deckId,
	userId,
	cardToEdit,
	onSuccess,
	onCancel,
}: CardFormProps) {
	const router = useRouter();
	const form = useForm<CardFormValues>({
		defaultValues: {
			frontContent: cardToEdit?.front_content
				? JSON.stringify(cardToEdit.front_content)
				: emptyTiptapContent,
			backContent: cardToEdit?.back_content
				? JSON.stringify(cardToEdit.back_content)
				: emptyTiptapContent,
		},
	});
	const [side, setSide] = useState<"front" | "back">("front");
	const [isLoading, setIsLoading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

	const onSubmit = async (values: CardFormValues) => {
		setIsLoading(true);
		try {
			const { frontContent, backContent } = values;
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

			if (cardToEdit) {
				// 更新処理
				const updatedCardData = await updateCard(cardToEdit.id, {
					front_content: JSON.parse(frontContent),
					back_content: JSON.parse(backContent),
				});
				toast.success("カードを更新しました");
				if (onSuccess) onSuccess(updatedCardData); // 更新されたカードデータを渡す
			} else {
				// 新規作成処理
				const newCardData = await createCard({
					user_id: userId,
					deck_id: deckId,
					front_content: JSON.parse(frontContent),
					back_content: JSON.parse(backContent),
				});
				toast.success("カードを作成しました");
				if (onSuccess) onSuccess(newCardData); // 作成されたカードデータを渡す
			}
			// onSuccess が提供されていれば、そちらでダイアログを閉じるなどの処理を期待
			// onSuccess がなく、かつ新規作成モードだった場合のフォールバック
			if (!onSuccess && !cardToEdit) {
				// 新規作成時で onSuccess がない場合のみリダイレクト
				router.push(`/decks/${deckId}`); // onSuccessがない場合のフォールバック
			}
		} catch (err: unknown) {
			const actionType = cardToEdit ? "更新" : "作成";
			logger.error({ error: err }, `カード${actionType}エラー`);
			toast.error(
				err instanceof Error
					? err.message
					: `カードの${actionType}中にエラーが発生しました。`,
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
			logger.error({ error: e }, "フロントコンテンツのパースエラー");
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
			logger.error({ error: err }, "回答生成エラー");
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
				<div className="flex space-x-2 mb-4">
					<Button
						variant="outline"
						type="button"
						onClick={() => {
							if (onCancel) onCancel();
							else if (!cardToEdit) router.push(`/decks/${deckId}`); // 新規作成時のみ
						}}
					>
						キャンセル
					</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading
							? cardToEdit
								? "更新中..."
								: "作成中..."
							: cardToEdit
								? "カードを更新"
								: "カードを作成"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
