import { Camera, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

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
	const [sortBy, setSortBy] = useState<string>("updated_at_desc");
	const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
	const [newDeckTitle, setNewDeckTitle] = useState<string>("");
	const router = useRouter();

	// 外部デッキがあればそれを優先、なければフェッチしたデッキを使用
	const deckList: DeckWithCount[] = externalDecks
		? externalDecks
		: fetchedDecks.map((d) => ({ ...d, todayReviewCount: 0 }));

	// フィルタリングとソート
	const filteredAndSortedDecks = deckList
		.filter((deck) =>
			deck.title.toLowerCase().includes(searchQuery.toLowerCase()),
		)
		.sort((a, b) => {
			switch (sortBy) {
				case "updated_at_desc":
					return (
						new Date(b.updated_at || 0).getTime() -
						new Date(a.updated_at || 0).getTime()
					);
				case "updated_at_asc":
					return (
						new Date(a.updated_at || 0).getTime() -
						new Date(b.updated_at || 0).getTime()
					);
				case "created_at_desc":
					return (
						new Date(b.created_at || 0).getTime() -
						new Date(a.created_at || 0).getTime()
					);
				case "created_at_asc":
					return (
						new Date(a.created_at || 0).getTime() -
						new Date(b.created_at || 0).getTime()
					);
				case "title_asc":
					return a.title.localeCompare(b.title);
				case "title_desc":
					return b.title.localeCompare(a.title);
				default:
					return 0;
			}
		});

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
				.eq("user_id", user.id)
				.order("updated_at", { ascending: false });
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

	const handleCreateDeck = async () => {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;
		const { data, error } = await supabase
			.from("decks")
			.insert({ title: newDeckTitle, user_id: user.id })
			.select("*")
			.maybeSingle();
		if (error || !data) {
			console.error("Failed to create deck:", error);
			return;
		}
		const newDeck: DeckWithCount = { ...data, todayReviewCount: 0 };
		setFetchedDecks((prev) => [newDeck, ...prev]);
		setSelectedDeckId(newDeck.id);
		setNewDeckTitle("");
		setShowCreateForm(false);
		onDeckSelect?.(newDeck.id);
	};

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={onOpenChange}
			dialogTitle={dialogTitle}
		>
			<div className="space-y-4 max-h-[70vh] overflow-y-auto">
				<div>
					<div className="flex items-center justify-between mb-2">
						<Label>デッキを選択</Label>
						<Select value={sortBy} onValueChange={setSortBy}>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="updated_at_desc">
									更新日（新しい順）
								</SelectItem>
								<SelectItem value="updated_at_asc">更新日（古い順）</SelectItem>
								<SelectItem value="created_at_desc">
									作成日（新しい順）
								</SelectItem>
								<SelectItem value="created_at_asc">作成日（古い順）</SelectItem>
								<SelectItem value="title_asc">タイトル（昇順）</SelectItem>
								<SelectItem value="title_desc">タイトル（降順）</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="mt-1 text-sm text-gray-600">
						選択中：{selectedDeck?.title ?? "なし"}
					</div>
					<Command className="mt-2">
						<CommandInput
							placeholder="デッキを検索"
							value={searchQuery}
							onValueChange={(value) => setSearchQuery(value)}
						/>
						<CommandList className="max-h-[200px] overflow-y-auto">
							{filteredAndSortedDecks.length === 0 ? (
								<CommandEmpty>デッキが見つかりません</CommandEmpty>
							) : (
								<CommandGroup heading="デッキ">
									{filteredAndSortedDecks.map((deck) => (
										<CommandItem
											key={deck.id}
											onSelect={() => handleDeckSelect(deck.id)}
											className={
												selectedDeckId === deck.id
													? "bg-accent text-accent-foreground"
													: ""
											}
										>
											<div className="flex flex-col items-start">
												<span>{deck.title}</span>
												<span className="text-xs text-muted-foreground">
													更新:{" "}
													{deck.updated_at
														? new Date(deck.updated_at).toLocaleDateString(
																"ja-JP",
															)
														: "なし"}
												</span>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							)}
						</CommandList>
					</Command>
				</div>
				{showCreateForm ? (
					<div className="space-y-2 mt-2">
						<Input
							placeholder="新しいデッキ名を入力"
							value={newDeckTitle}
							onChange={(e) => setNewDeckTitle(e.target.value)}
						/>
						<div className="flex space-x-2">
							<Button onClick={handleCreateDeck} disabled={!newDeckTitle}>
								作成
							</Button>
							<Button variant="ghost" onClick={() => setShowCreateForm(false)}>
								キャンセル
							</Button>
						</div>
					</div>
				) : (
					<Button
						variant="link"
						onClick={() => setShowCreateForm(true)}
						className="mt-2"
					>
						＋ 新規デッキ作成
					</Button>
				)}
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
