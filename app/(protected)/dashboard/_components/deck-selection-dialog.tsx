import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { Camera, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type * as React from "react";

// データベースのデッキ row に復習数を付与した型
type DeckWithCount = Database["public"]["Tables"]["decks"]["Row"] & {
	todayReviewCount?: number;
};

interface DeckSelectionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	dialogTitle: string;
	/**
	 * 外部から渡すデッキリスト (FSRS復習数付き)
	 */
	decks?: DeckWithCount[];
	onDeckSelect?: (deckId: string) => void;
	showActionButtons?: boolean;
	renderActionButtons?: (params: {
		selectedDeck: DeckWithCount;
		closeDialog: () => void;
	}) => React.ReactNode;
}

export const DeckSelectionDialog: React.FC<DeckSelectionDialogProps> = ({
	open,
	onOpenChange,
	dialogTitle,
	onDeckSelect,
	decks: externalDecks,
	showActionButtons = true,
	renderActionButtons,
}) => {
	// 内部でフェッチするデッキ
	const [fetchedDecks, setFetchedDecks] = useState<
		Database["public"]["Tables"]["decks"]["Row"][]
	>([]);
	const [selectedDeckId, setSelectedDeckId] = useState<string>("");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const router = useRouter();

	// 外部デッキがあればそれを優先、なければフェッチしたデッキを使用
	const deckList: DeckWithCount[] = externalDecks
		? externalDecks
		: fetchedDecks.map((d) => ({ ...d, todayReviewCount: 0 }));
	const filteredDecks = deckList.filter((deck) =>
		deck.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const selectedDeck = deckList.find((deck) => deck.id === selectedDeckId);

	useEffect(() => {
		// 外部デッキリストがある場合はフェッチをスキップし、初期選択のみ設定
		if (externalDecks) {
			if (externalDecks.length > 0) {
				setSelectedDeckId(externalDecks[0].id);
			}
			return;
		}
		(async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;
			const { data, error } = await supabase
				.from("decks")
				.select("*")
				.eq("user_id", user.id);
			if (error) {
				console.error("Failed to fetch decks:", error);
				return;
			}
			if (data?.length) {
				setFetchedDecks(data);
				setSelectedDeckId(data[0].id);
			}
		})();
	}, [externalDecks]);

	const handleDeckSelect = (deckId: string) => {
		setSelectedDeckId(deckId);
		setSearchQuery("");
		if (onDeckSelect) {
			onDeckSelect(deckId);
		}
	};

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={onOpenChange}
			dialogTitle={dialogTitle}
		>
			<div className="space-y-4">
				<div>
					<Label>デッキを選択</Label>
					<div className="mt-1 text-sm text-gray-600">
						選択中：{selectedDeck?.title ?? "なし"}
					</div>
					<Command className="mt-2">
						<CommandInput
							placeholder="デッキを検索"
							value={searchQuery}
							onValueChange={(value) => setSearchQuery(value)}
						/>
						<CommandList>
							{filteredDecks.length === 0 ? (
								<CommandEmpty>デッキが見つかりません</CommandEmpty>
							) : (
								<CommandGroup heading="デッキ">
									{filteredDecks.map((deck) => (
										<CommandItem
											key={deck.id}
											onSelect={() => handleDeckSelect(deck.id)}
											className={
												selectedDeckId === deck.id
													? "bg-accent text-accent-foreground"
													: ""
											}
										>
											{deck.title}
										</CommandItem>
									))}
								</CommandGroup>
							)}
						</CommandList>
					</Command>
				</div>
				{showActionButtons ? (
					<div className="space-y-2">
						<Label>生成方法を選択</Label>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							<Button
								size="lg"
								className="w-full"
								onClick={() => router.push(`/decks/${selectedDeckId}/audio`)}
								disabled={!selectedDeckId}
							>
								<Mic className="h-6 w-6" />
								音読する
							</Button>
							<Button
								size="lg"
								className="w-full"
								onClick={() => router.push(`/decks/${selectedDeckId}/ocr`)}
								disabled={!selectedDeckId}
							>
								<Camera className="h-6 w-6" />
								画像を撮る
							</Button>
						</div>
					</div>
				) : (
					renderActionButtons &&
					selectedDeck && (
						<div className="space-y-2">
							{renderActionButtons({
								selectedDeck,
								closeDialog: () => onOpenChange(false),
							})}
						</div>
					)
				)}
			</div>
		</ResponsiveDialog>
	);
};
