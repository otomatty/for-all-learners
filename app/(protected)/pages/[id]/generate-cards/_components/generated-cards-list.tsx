"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export interface RawGeneratedCard {
	front_content: string;
	back_content: string;
}

// Reactのkeyとして使用する内部IDを含むカードの型
interface EditableCard extends RawGeneratedCard {
	_internalId: string;
}

interface GeneratedCardsListProps {
	cards: RawGeneratedCard[];
	onSave: (updatedCards: RawGeneratedCard[]) => void;
	onCancel: () => void;
	isSaving: boolean;
	onDeleteCard: (index: number) => void;
}

export function GeneratedCardsList({
	cards,
	onSave,
	onCancel,
	isSaving,
	onDeleteCard,
}: GeneratedCardsListProps) {
	const [editableCards, setEditableCards] = useState<EditableCard[]>([]);

	useEffect(() => {
		setEditableCards(cards.map((card) => ({ ...card, _internalId: uuidv4() })));
	}, [cards]);

	const handleCardChange = (
		index: number,
		field: "front_content" | "back_content",
		value: string,
	) => {
		const newCards = [...editableCards];
		newCards[index] = { ...newCards[index], [field]: value };
		setEditableCards(newCards);
	};

	const handleSave = () => {
		// 親コンポーネントには RawGeneratedCard[] 型で渡すため、_internalId を除外
		const cardsToSave: RawGeneratedCard[] = editableCards.map(
			({ _internalId, ...rest }) => rest,
		);
		onSave(cardsToSave);
	};

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold">生成されたカードの確認</h2>
			<p className="text-muted-foreground">
				以下のカードが生成されました。内容を確認・編集し、問題なければ保存してください。
			</p>
			<div className="space-y-4">
				{editableCards.map((card, index) => (
					<Card key={card._internalId}>
						<CardHeader>
							<div className="flex justify-between items-center">
								<CardTitle>カード {index + 1}</CardTitle>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => onDeleteCard(index)}
									aria-label={`カード ${index + 1} を削除`}
									disabled={isSaving}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">
									表面
								</p>
								<Textarea
									value={card.front_content}
									onChange={(e) =>
										handleCardChange(index, "front_content", e.target.value)
									}
									className="min-h-[80px] whitespace-pre-wrap"
									disabled={isSaving}
								/>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">
									裏面
								</p>
								<Textarea
									value={card.back_content}
									onChange={(e) =>
										handleCardChange(index, "back_content", e.target.value)
									}
									className="min-h-[80px] whitespace-pre-wrap"
									disabled={isSaving}
								/>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
			<div className="flex flex-col sm:flex-row gap-4 mt-6">
				<Button
					onClick={handleSave}
					disabled={isSaving || editableCards.length === 0}
					className="w-full sm:w-auto"
				>
					{isSaving ? "保存中..." : `${editableCards.length}枚のカードを保存`}
				</Button>
				<Button
					variant="outline"
					onClick={onCancel}
					disabled={isSaving}
					className="w-full sm:w-auto"
				>
					キャンセルして再生成
				</Button>
			</div>
		</div>
	);
}
