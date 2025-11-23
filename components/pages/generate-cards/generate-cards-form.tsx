"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useGenerateCardsFromPage } from "@/lib/hooks/ai";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	const generateCardsMutation = useGenerateCardsFromPage();
	const [selectedDeckId, setSelectedDeckId] = useState<string>(
		decks[0]?.id || "",
	);
	const [rawGeneratedCards, setRawGeneratedCards] = useState<
		RawGeneratedCard[] | null
	>(null);
	const isGenerating = generateCardsMutation.isPending;
	const isSaving = generateCardsMutation.isPending;

	const deckSelectId = useId();

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

		try {
			const response = await generateCardsMutation.mutateAsync({
				pageContentTiptap: page.content_tiptap,
				pageId: page.id,
				deckId: selectedDeckId,
				saveToDatabase: false,
			});

			if (response.error) {
				toast.error(`カード生成エラー: ${response.error}`);
				setRawGeneratedCards(null);
			} else if (response.cards.length === 0) {
				toast.info(
					"テキストからカードを抽出できませんでした。文章量を増やすか、内容を調整してみてください。",
				);
				setRawGeneratedCards(null);
			} else {
				toast.success("カードが生成されました。内容を確認してください。");
				setRawGeneratedCards(response.cards);
			}
		} catch (e: unknown) {
			if (e instanceof Error) {
				toast.error(`予期せぬエラーが発生しました: ${e.message}`);
			} else {
				toast.error("予期せぬエラーが発生しました。");
			}
			setRawGeneratedCards(null);
		}
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

		try {
			// API Routeでカードを生成して保存
			const response = await generateCardsMutation.mutateAsync({
				pageContentTiptap: page.content_tiptap,
				pageId: page.id,
				deckId: selectedDeckId,
				saveToDatabase: true,
			});

			if (response.error) {
				toast.error(`カード保存エラー: ${response.error}`);
			} else {
				const savedCount = response.savedCardsCount || response.cards.length;
				toast.success(`${savedCount}枚のカードが保存されました！`);
				setRawGeneratedCards(null); // 保存後はリストをクリア
				router.push(`/decks/${selectedDeckId}`); // デッキページへ遷移
			}
		} catch (e: unknown) {
			if (e instanceof Error) {
				toast.error(
					`カード保存中に予期せぬエラーが発生しました: ${e.message}`,
				);
			} else {
				toast.error("カード保存中に予期せぬエラーが発生しました。");
			}
		}
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
					<div className="w-fit">
						<Label htmlFor={deckSelectId} className="mb-2 block">
							保存先のデッキ
						</Label>
						{decks.length > 0 ? (
							<Select
								value={selectedDeckId}
								onValueChange={setSelectedDeckId}
								disabled={isGenerating}
							>
								<SelectTrigger id={deckSelectId} className="w-full">
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
