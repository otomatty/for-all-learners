"use client";

import type { JSONContent } from "@tiptap/core";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/responsive-dialog"; // ResponsiveDialog をインポート
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useTextSelection } from "@/hooks/use-text-selection";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { CardItem } from "./card-item"; // CardItem をインポート
import { RichContent } from "./rich-content";

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
	const [userId, setUserId] = useState<string | null>(null);
	const [isCreateCardDialogOpen, setIsCreateCardDialogOpen] = useState(false);

	// Prop 'cards' が変更されたら localCards を更新する
	useEffect(() => {
		setLocalCards(cards);
	}, [cards]);
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

	useEffect(() => {
		const fetchUser = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) setUserId(user.id);
		};
		fetchUser();
	}, [supabase]);

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

	// isLoading が false の場合の処理
	if (localCards.length === 0) {
		const emptyMessage = (
			<div className="flex flex-col items-center justify-center h-40 border border-border rounded-lg transition-shadow bg-muted">
				<p className="text-muted-foreground">カードがありません</p>
				{canEdit && (
					<p className="text-sm text-muted-foreground">
						「音読する」「画像を読み込む」ボタンからカードを作成してください
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

	const handleCardMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		dragStartRef.current = { x: e.clientX, y: e.clientY };
		isDraggingRef.current = false;
	};

	const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (dragStartRef.current) {
			const dx = e.clientX - dragStartRef.current.x;
			const dy = e.clientY - dragStartRef.current.y;
			if (Math.hypot(dx, dy) > 5) {
				isDraggingRef.current = true;
			}
		}
	};

	const handleCardMouseUp = (
		e: React.MouseEvent<HTMLDivElement>,
		card: Database["public"]["Tables"]["cards"]["Row"],
	) => {
		if (e.button !== 0) return;
		if (!isDraggingRef.current) {
			setDetailCard(card);
		} else if (selectedText) {
			// selection occurred, set cardId for link conversion
			setSelectionCardId(card.id);
		}
		dragStartRef.current = null;
		isDraggingRef.current = false;
	};

	const handleCardUpdated = (
		updatedCard: Database["public"]["Tables"]["cards"]["Row"],
	) => {
		setLocalCards((prevCards) =>
			prevCards.map((card) =>
				card.id === updatedCard.id ? updatedCard : card,
			),
		);
		router.refresh(); // データの整合性を保つためにバックグラウンドで再フェッチ
	};

	const handleCreateCardSuccess = (
		newCard: Database["public"]["Tables"]["cards"]["Row"],
	) => {
		setLocalCards((prevCards) => [newCard, ...prevCards]); // 新しいカードをリストの先頭に追加
		setIsCreateCardDialogOpen(false); // ダイアログを閉じる
		router.refresh(); // データの整合性を保つためにバックグラウンドで再フェッチ
		toast.info("新しいカードがリストに追加されました。"); // 必要に応じて通知
	};

	const gridContent = (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{localCards.map((card) => (
				<CardItem
					key={card.id}
					card={card}
					isBlurred={!!(hoveredCardId && hoveredCardId !== card.id)}
					onMouseEnter={() => setHoveredCardId(card.id)}
					onMouseLeave={() => setHoveredCardId(null)}
					onMouseDown={handleCardMouseDown}
					onMouseMove={handleCardMouseMove}
					onMouseUp={(e) => handleCardMouseUp(e, card)}
					deckId={deckId} // deckId を渡す
					userId={userId} // userId を渡す
					canEdit={canEdit} // canEdit を渡す
					onCardUpdated={handleCardUpdated} // 更新ハンドラを渡す
				/>
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
							<DialogTitle>答え</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="prose">
								<RichContent content={detailCard.back_content} />
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
