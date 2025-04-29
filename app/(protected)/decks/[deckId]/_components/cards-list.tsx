"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardActions } from "./card-actions";
import type { Database } from "@/types/database.types";
import { useTextSelection } from "@/hooks/use-text-selection";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@/components/ui/popover";
import { RichContent } from "./rich-content";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/core";

interface CardsListProps {
	cards: Database["public"]["Tables"]["cards"]["Row"][];
	deckId: string;
	canEdit: boolean;
}

export function CardsList({ cards, deckId, canEdit }: CardsListProps) {
	const { selectedText, selectionRect, clearSelection } = useTextSelection();
	const supabase = createClient();
	const router = useRouter();

	useEffect(() => {
		console.debug(
			"[CardsList] selectedText:",
			selectedText,
			"selectionRect:",
			selectionRect,
		);
	}, [selectedText, selectionRect]);

	// Debug: log computed popup positions when selectionRect updates
	useEffect(() => {
		if (selectionRect) {
			const popupTop = selectionRect.y + window.scrollY;
			const popupLeft = selectionRect.x + window.scrollX;
			console.debug(
				"[CardsList] computed popupTop:",
				popupTop,
				"popupLeft:",
				popupLeft,
			);
		}
	}, [selectionRect]);

	const handleConvertLink = async (text: string) => {
		if (!selectionRect) {
			clearSelection();
			return;
		}
		const { x, y, width, height } = selectionRect;
		const el = document.elementFromPoint(x + width / 2, y + height / 2);
		const cardEl = el?.closest("[data-card-id]");
		const cardId = cardEl?.getAttribute("data-card-id");
		if (!cardId) {
			clearSelection();
			toast.error("カードが特定できませんでした");
			return;
		}
		const card = cards.find((c) => c.id === cardId);
		if (!card) {
			clearSelection();
			toast.error("カードが見つかりません");
			return;
		}
		try {
			const doc = card.front_content as JSONContent;
			let wrapped = false;
			function wrapNode(node: JSONContent): JSONContent[] {
				if (wrapped) return [node];
				if (
					node.type === "text" &&
					typeof node.text === "string" &&
					node.text.includes(text)
				) {
					const parts = node.text.split(text);
					const result: JSONContent[] = [];
					parts.forEach((part, idx) => {
						if (idx > 0) {
							result.push({
								type: "text",
								text,
								marks: [
									{ type: "pageLink", attrs: { pageName: text, pageId: null } },
								],
							});
						}
						if (part) {
							result.push({ type: "text", text: part });
						}
					});
					wrapped = true;
					return result;
				}
				if (node.content && Array.isArray(node.content)) {
					return [{ ...node, content: node.content.flatMap(wrapNode) }];
				}
				return [node];
			}
			const updatedDoc: JSONContent = {
				...doc,
				content: (doc.content ?? []).flatMap(wrapNode),
			};
			const { error } = await supabase
				.from("cards")
				.update({ front_content: updatedDoc })
				.eq("id", cardId);
			if (error) {
				toast.error(error.message || "リンク設定に失敗しました");
			} else {
				toast.success("リンクを設定しました");
				router.refresh();
			}
		} catch (err: unknown) {
			console.error("リンク設定エラー:", err);
			toast.error(
				err instanceof Error
					? err.message
					: "リンク設定中にエラーが発生しました",
			);
		} finally {
			clearSelection();
		}
	};

	if (cards.length === 0) {
		const emptyMessage = (
			<div className="flex flex-col items-center justify-center h-40 border rounded-lg">
				<p className="text-muted-foreground">カードがありません</p>
				{canEdit && (
					<p className="text-sm text-muted-foreground">
						「新規カード」ボタンからカードを作成してください
					</p>
				)}
			</div>
		);
		return (
			<div className="relative">
				{emptyMessage}
				{selectedText && selectionRect && (
					<Popover open onOpenChange={(open) => !open && clearSelection()}>
						<PopoverTrigger asChild>
							<span
								style={{
									position: "fixed",
									top: selectionRect.y + window.scrollY,
									left: selectionRect.x + window.scrollX,
									width: selectionRect.width,
									height: selectionRect.height,
									pointerEvents: "none",
								}}
								aria-hidden
							/>
						</PopoverTrigger>
						<PopoverContent side="top" align="start" sideOffset={5}>
							<p className="mb-2 text-sm">
								"{selectedText}" をリンクに変換しますか？
							</p>
							<div className="flex space-x-2">
								<Button
									size="sm"
									onClick={() => handleConvertLink(selectedText)}
								>
									はい
								</Button>
								<Button size="sm" variant="outline" onClick={clearSelection}>
									いいえ
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				)}
			</div>
		);
	}

	const gridContent = (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{cards.map((card) => (
				<Card
					key={card.id}
					data-card-id={card.id}
					className="h-full overflow-hidden"
				>
					<CardContent>
						<div className="prose prose-sm line-clamp-3 rich-content">
							<RichContent content={card.front_content} />
						</div>
					</CardContent>
					<CardFooter className="flex justify-between">
						<div className="text-xs text-muted-foreground">
							{formatDistanceToNow(new Date(card.created_at || ""), {
								addSuffix: true,
								locale: ja,
							})}
							に作成
						</div>
						<div className="flex space-x-2">
							<Button asChild variant="outline" size="sm">
								<Link href={`/decks/${deckId}/cards/${card.id}`}>詳細</Link>
							</Button>
							{canEdit && <CardActions cardId={card.id} deckId={deckId} />}
						</div>
					</CardFooter>
				</Card>
			))}
		</div>
	);
	return (
		<div className="relative">
			{gridContent}
			{selectedText && selectionRect && (
				<Popover open onOpenChange={(open) => !open && clearSelection()}>
					<PopoverTrigger asChild>
						<span
							style={{
								position: "fixed",
								top: selectionRect.y + window.scrollY,
								left: selectionRect.x + window.scrollX,
								width: selectionRect.width,
								height: selectionRect.height,
								pointerEvents: "none",
							}}
							aria-hidden
						/>
					</PopoverTrigger>
					<PopoverContent side="top" align="start" sideOffset={5}>
						<p className="mb-2 text-sm">
							"{selectedText}" をリンクに変換しますか？
						</p>
						<div className="flex space-x-2">
							<Button size="sm" onClick={() => handleConvertLink(selectedText)}>
								はい
							</Button>
							<Button size="sm" variant="outline" onClick={clearSelection}>
								いいえ
							</Button>
						</div>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}
