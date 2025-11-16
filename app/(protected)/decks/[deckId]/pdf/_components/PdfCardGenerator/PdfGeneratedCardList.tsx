"use client";

import { CheckCircle, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCreateCards } from "@/hooks/cards";
import type { Json } from "@/types/database.types";
import type {
	GeneratedCardListProps,
	TiptapContent,
} from "@/types/pdf-card-generator";

export function PdfGeneratedCardList({
	cards,
	selectedCards,
	onCardSelection,
	onSelectAll,
	onDeselectAll,
	deckId,
	userId,
}: Omit<GeneratedCardListProps, "onSaveCards" | "isSaving">) {
	const router = useRouter();
	const createCardsMutation = useCreateCards();
	const isSaving = createCardsMutation.isPending;

	const selectedCount = Object.values(selectedCards).filter(Boolean).length;

	const saveSelectedCards = async () => {
		const selectedCardsList = cards.filter(
			(_, index) => selectedCards[index.toString()],
		);

		if (selectedCardsList.length === 0) {
			toast.error("保存するカードを選択してください");
			return;
		}

		try {
			// TiptapJSON形式のカードデータに変換
			const cardsToInsert = selectedCardsList.map((card) => ({
				user_id: userId,
				deck_id: deckId,
				front_content: card.front_content,
				back_content: card.back_content,
				source_pdf_url: card.source_pdf_url,
			}));

			await createCardsMutation.mutateAsync(cardsToInsert);

			toast.success("カードを保存しました", {
				description: `${selectedCardsList.length}件のカードを保存しました。`,
			});

			router.push(`/decks/${deckId}`);
		} catch (error) {
			toast.error("エラーが発生しました", {
				description:
					error instanceof Error
						? error.message
						: "カードの保存中にエラーが発生しました。",
			});
		}
	};

	if (cards.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<CheckCircle className="h-5 w-5 text-green-600" />
						生成されたカード ({cards.length}件)
					</CardTitle>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={onSelectAll}>
							すべて選択
						</Button>
						<Button variant="outline" size="sm" onClick={onDeselectAll}>
							すべて解除
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{/* スクロール制限を削除してページスクロールに変更 */}
				<div className="space-y-4">
					{cards.map((card, index) => {
						const indexStr = index.toString();
						const isSelected = selectedCards[indexStr] || false;

						// TiptapJSONからテキストを抽出
						const frontText =
							typeof card.front_content === "object" &&
							card.front_content &&
							"content" in card.front_content
								? extractTextFromTiptap(card.front_content as Json)
								: String(card.front_content);

						const backText =
							typeof card.back_content === "object" &&
							card.back_content &&
							"content" in card.back_content
								? extractTextFromTiptap(card.back_content as Json)
								: String(card.back_content);

						return (
							<div
								key={card.metadata.problem_id}
								className={`border rounded-lg p-4 ${
									isSelected ? "border-blue-200 bg-blue-50" : "border-gray-200"
								}`}
							>
								<div className="flex items-start gap-3">
									<Checkbox
										id={`card-${index}`}
										checked={isSelected}
										onCheckedChange={(checked) =>
											onCardSelection(indexStr, !!checked)
										}
										className="mt-1"
									/>
									<div className="flex-1 space-y-2">
										<div className="flex items-center gap-2">
											<Badge variant="outline">ページ {card.source_page}</Badge>
											{card.metadata && (
												<Badge variant="secondary">
													信頼度:{" "}
													{Math.round(card.metadata.confidence_score * 100)}%
												</Badge>
											)}
										</div>
										<div className="space-y-1">
											<Label className="text-xs text-muted-foreground">
												問題文
											</Label>
											<p className="text-sm border-l-2 border-blue-200 pl-3">
												{frontText.slice(0, 150)}
												{frontText.length > 150 && "..."}
											</p>
										</div>
										<div className="space-y-1">
											<Label className="text-xs text-muted-foreground">
												解答
											</Label>
											<p className="text-sm border-l-2 border-green-200 pl-3">
												{backText.slice(0, 100)}
												{backText.length > 100 && "..."}
											</p>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
			<CardFooter className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{selectedCount}件のカードが選択されています
				</p>
				<Button
					onClick={saveSelectedCards}
					disabled={selectedCount === 0 || isSaving}
					className="flex items-center gap-2"
				>
					{isSaving ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Save className="h-4 w-4" />
					)}
					選択したカードを保存
				</Button>
			</CardFooter>
		</Card>
	);
}

// TiptapJSONからテキストを抽出するヘルパー関数
function extractTextFromTiptap(content: Json): string {
	if (!content || typeof content !== "object" || Array.isArray(content))
		return "";

	const tiptapContent = content as TiptapContent;

	if (!tiptapContent.content) return "";

	return tiptapContent.content
		?.map((node) => {
			if (node.type === "paragraph" && node.content) {
				return node.content.map((textNode) => textNode.text || "").join("");
			}
			return "";
		})
		.join("\n")
		.trim();
}
