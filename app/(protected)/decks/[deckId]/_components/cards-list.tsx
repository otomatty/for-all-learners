"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database.types";
import { useTextSelection } from "@/hooks/use-text-selection";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@/components/ui/popover";
import { RichContent } from "./rich-content";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/core";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { CardContextMenu } from "./card-context-menu";

interface CardsListProps {
	cards: Database["public"]["Tables"]["cards"]["Row"][];
	deckId: string;
	canEdit: boolean;
}

export function CardsList({ cards, deckId, canEdit }: CardsListProps) {
	const { selectedText, selectionRect, clearSelection } = useTextSelection();
	const supabase = createClient();
	const router = useRouter();
	// local state to manage cards for optimistic updates
	const [localCards, setLocalCards] =
		useState<Database["public"]["Tables"]["cards"]["Row"][]>(cards);
	const [detailCard, setDetailCard] = useState<
		Database["public"]["Tables"]["cards"]["Row"] | null
	>(null);
	// card id for link conversion after text selection drag
	const [selectionCardId, setSelectionCardId] = useState<string | null>(null);
	// refs to track drag for selection vs click
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);
	const isDraggingRef = useRef(false);
	// Add state to track hovered card for focus blur
	const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

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

	// update selectionCardId when text selection rectangle changes
	useEffect(() => {
		if (!selectionRect) {
			setSelectionCardId(null);
			return;
		}
		const { x, y, width, height } = selectionRect;
		const el = document.elementFromPoint(x + width / 2, y + height / 2);
		const cardEl = el?.closest("[data-card-id]");
		setSelectionCardId(cardEl?.getAttribute("data-card-id") ?? null);
	}, [selectionRect]);

	const handleConvertLink = async (text: string) => {
		// cardId should have been set on selection via onMouseUp
		const cardId = selectionCardId;
		if (!cardId) {
			clearSelection();
			toast.error("カードが特定できませんでした");
			return;
		}
		const card = localCards.find((c) => c.id === cardId);
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
				// Optimistically update local state to show link styling immediately
				setLocalCards((prev) =>
					prev.map((c) =>
						c.id === cardId ? { ...c, front_content: updatedDoc } : c,
					),
				);
				// No router.refresh needed
				setSelectionCardId(null);
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

	if (localCards.length === 0) {
		const emptyMessage = (
			<div className="flex flex-col items-center justify-center h-40 border rounded-lg hover:shadow-lg transition-shadow">
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
									top: selectionRect.top,
									left: selectionRect.left,
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
			{localCards.map((card) => (
				<CardContextMenu
					key={card.id}
					cardId={card.id}
					onEdit={() => {
						/* TODO: open edit dialog */
					}}
				>
					<Card
						data-card-id={card.id}
						// Track hover to blur sibling cards
						onMouseEnter={() => setHoveredCardId(card.id)}
						onMouseLeave={() => setHoveredCardId(null)}
						className={`overflow-hidden cursor-pointer transition-all duration-300 ease-in-out ${
							hoveredCardId && hoveredCardId !== card.id
								? "filter blur-xs opacity-60"
								: "hover:shadow-lg"
						}`}
						onMouseDown={(e) => {
							if (e.button !== 0) return;
							dragStartRef.current = { x: e.clientX, y: e.clientY };
							isDraggingRef.current = false;
						}}
						onMouseMove={(e) => {
							if (dragStartRef.current) {
								const dx = e.clientX - dragStartRef.current.x;
								const dy = e.clientY - dragStartRef.current.y;
								if (Math.hypot(dx, dy) > 5) {
									isDraggingRef.current = true;
								}
							}
						}}
						onMouseUp={(e) => {
							if (e.button !== 0) return;
							if (!isDraggingRef.current) {
								setDetailCard(card);
							} else if (selectedText) {
								// selection occurred, set cardId for link conversion
								setSelectionCardId(card.id);
							}
							dragStartRef.current = null;
							isDraggingRef.current = false;
						}}
					>
						<CardContent>
							<div className="prose prose-sm rich-content">
								<RichContent content={card.front_content} />
							</div>
						</CardContent>
					</Card>
				</CardContextMenu>
			))}
		</div>
	);
	return (
		<div className="relative">
			{gridContent}
			{detailCard && (
				<Dialog open={true} onOpenChange={() => setDetailCard(null)}>
					<DialogContent>
						<DialogHeader className="text-left">
							<DialogTitle>カード詳細</DialogTitle>
							<DialogDescription>
								カードの詳細情報を表示します
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">問題文</h3>
							<div className="prose">
								<RichContent content={detailCard.front_content} />
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}
			{selectedText && selectionRect && (
				<Popover open onOpenChange={(open) => !open && clearSelection()}>
					<PopoverTrigger asChild>
						<span
							style={{
								position: "fixed",
								top: selectionRect.top,
								left: selectionRect.left,
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
