"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	generateRawCardsFromPageContent,
	saveGeneratedCards,
	wrapTextInTiptapJson, // サーバーアクションからインポート
} from "@/app/_actions/generateCardsFromPage";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";
import {
	GeneratedCardsList,
	type RawGeneratedCard,
} from "./generated-cards-list";

type Page = Database["public"]["Tables"]["pages"]["Row"];
type Deck = Database["public"]["Tables"]["decks"]["Row"];

interface GenerateCardsFormProps {
	page: Page;
	decks: Deck[];
	userId: string;
}

export function GenerateCardsForm({
	page,
	decks,
	userId,
}: GenerateCardsFormProps) {
	const router = useRouter();
	const [selectedDeckId, setSelectedDeckId] = useState<string>(
		decks[0]?.id || "",
	);
	const [rawGeneratedCards, setRawGeneratedCards] = useState<
		RawGeneratedCard[] | null
	>(null);
	const [isGenerating, startGenerating] = useTransition();
	const [isSaving, startSaving] = useTransition();

	const handleGenerateCards = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();

		if (!selectedDeckId) {
			toast.error("デッキを選択してください。");
			return;
		}

		if (!page.content_tiptap) {
			toast.error(
				"ページにコンテンツがありません。カードを生成できませんでした。",
			);
			return;
		}

		setRawGeneratedCards(null); // 以前の生成結果をクリア

		startGenerating(async () => {
			try {
				const result = await generateRawCardsFromPageContent(
					page.content_tiptap, // content_tiptap (JSONB) を渡す
				);

				if (result.error) {
					toast.error(`カード生成エラー: ${result.error}`);
					setRawGeneratedCards(null);
				} else if (result.generatedRawCards.length === 0) {
					toast.info(
						"テキストからカードを抽出できませんでした。文章量を増やすか、内容を調整してみてください。",
					);
					setRawGeneratedCards(null);
				} else {
					toast.success("カードが生成されました。内容を確認してください。");
					setRawGeneratedCards(result.generatedRawCards);
				}
			} catch (e: any) {
				toast.error(`予期せぬエラーが発生しました: ${e.message}`);
				setRawGeneratedCards(null);
			}
		});
	};

	const handleSaveCards = async () => {
		if (
			!rawGeneratedCards ||
			rawGeneratedCards.length === 0 ||
			!selectedDeckId
		) {
			toast.error("保存するカードがないか、デッキが選択されていません。");
			return;
		}

		const cardsToSavePromises = rawGeneratedCards.map(async (rawCard) => ({
			deck_id: selectedDeckId,
			user_id: userId,
			page_id: page.id,
			front_content: await wrapTextInTiptapJson(rawCard.front_content),
			back_content: await wrapTextInTiptapJson(rawCard.back_content),
		}));

		const cardsToSave = await Promise.all(cardsToSavePromises);

		startSaving(async () => {
			try {
				const result = await saveGeneratedCards(cardsToSave, userId);
				if (result.error) {
					toast.error(`カード保存エラー: ${result.error}`);
				} else {
					toast.success(
						`${result.savedCardsCount}枚のカードが保存されました！`,
					);
					setRawGeneratedCards(null); // 保存後はリストをクリア
					// router.push(`/decks/${selectedDeckId}`); // デッキページへ遷移など
					router.push(`/decks/${selectedDeckId}`); // デッキページへ遷移
					// router.refresh(); // デッキページへ遷移するため、現在のページのリフレッシュは不要になる可能性が高い
				}
			} catch (e: any) {
				toast.error(`カード保存中に予期せぬエラーが発生しました: ${e.message}`);
			}
		});
	};

	const handleCancelAndRegenerate = () => {
		setRawGeneratedCards(null);
		// フォームの入力値をリセットしたい場合はここで行う
	};

	const handleDeleteCard = (index: number) => {
		if (!rawGeneratedCards) return;
		const newCards = rawGeneratedCards.filter((_, i) => i !== index);
		setRawGeneratedCards(newCards);
		if (newCards.length === 0) {
			toast.info(
				"すべてのカードが削除されました。再度生成するか、キャンセルしてください。",
			);
		}
	};

	return (
		<div className="space-y-8">
			{!rawGeneratedCards ? (
				<form onSubmit={handleGenerateCards} className="space-y-6">
					<div>
						<Label htmlFor="deck-select" className="mb-2 block">
							保存先のデッキ
						</Label>
						{decks.length > 0 ? (
							<Select
								value={selectedDeckId}
								onValueChange={setSelectedDeckId}
								disabled={isGenerating}
							>
								<SelectTrigger id="deck-select" className="w-full">
									<SelectValue placeholder="デッキを選択してください" />
								</SelectTrigger>
								<SelectContent>
									{decks.map((deck) => (
										<SelectItem key={deck.id} value={deck.id}>
											{deck.title || "名称未設定のデッキ"}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<p className="text-sm text-muted-foreground">
								利用可能なデッキがありません。
								<Button
									variant="link"
									onClick={() => router.push("/decks/new")}
								>
									新しいデッキを作成
								</Button>
							</p>
						)}
					</div>

					<Button
						type="submit"
						disabled={isGenerating || decks.length === 0 || !selectedDeckId}
						className="w-full sm:w-auto"
					>
						{isGenerating ? "生成中..." : "カードを生成する"}
					</Button>
				</form>
			) : (
				<GeneratedCardsList
					cards={rawGeneratedCards}
					onSave={handleSaveCards}
					onCancel={handleCancelAndRegenerate}
					isSaving={isSaving}
					onDeleteCard={handleDeleteCard}
				/>
			)}
		</div>
	);
}
