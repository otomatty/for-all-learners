"use client";
import type React from "react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import type { Database } from "@/types/database.types";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sparkles, Mic, Repeat, FileText, Camera } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
	Command,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from "@/components/ui/command";
export const QuickActionTiles: React.FC = () => {
	const [isQuickActionDialogOpen, setIsQuickActionDialogOpen] = useState(false);
	// State for deck list and selection
	const [decks, setDecks] = useState<
		Database["public"]["Tables"]["decks"]["Row"][]
	>([]);
	const [selectedDeckId, setSelectedDeckId] = useState<string>("");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const filteredDecks = decks.filter((deck) =>
		deck.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// Find currently selected deck for display
	const selectedDeck = decks.find((deck) => deck.id === selectedDeckId);

	const router = useRouter();

	useEffect(() => {
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
				setDecks(data);
				setSelectedDeckId(data[0].id);
			}
		})();
	}, []);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
			{/* Step 1: AI問題作成 */}
			<Card className="flex flex-col hover:shadow-lg transition-shadow">
				<CardHeader className="flex flex-col">
					<span className="text-sm text-gray-500">Step 1</span>
					<div className="flex items-center space-x-2 mt-2">
						<Sparkles className="h-6 w-6" />
						<CardTitle>AI問題作成</CardTitle>
					</div>
					<CardDescription className="mt-1">
						音読または画像から問題カードを自動生成します
					</CardDescription>
				</CardHeader>
				<CardFooter>
					{/* Open dialog to select deck and workflow */}
					<Button
						variant="default"
						className="w-full"
						onClick={() => setIsQuickActionDialogOpen(true)}
					>
						問題を作成する
					</Button>
					<ResponsiveDialog
						open={isQuickActionDialogOpen}
						onOpenChange={setIsQuickActionDialogOpen}
						dialogTitle="問題を作成する"
					>
						<div className="space-y-4">
							<div>
								<Label>デッキを選択</Label>
								{/* Display selected deck title */}
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
														onSelect={() => {
															setSelectedDeckId(deck.id);
															// Clear search after selection
															setSearchQuery("");
														}}
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
							<div className="space-y-2">
								<Label>生成方法を選択</Label>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
									<Button
										size="lg"
										className="w-full"
										onClick={() =>
											router.push(`/decks/${selectedDeckId}/audio`)
										}
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
						</div>
					</ResponsiveDialog>
				</CardFooter>
			</Card>
			{/* Step 2: カード復習 */}
			<Card className="flex flex-col justify-between hover:shadow-lg transition-shadow">
				<CardHeader className="flex flex-col">
					<span className="text-sm text-gray-500">Step 2</span>
					<div className="flex items-center space-x-2 mt-2">
						<Repeat className="h-6 w-6" />
						<CardTitle>繰り返し学習</CardTitle>
					</div>
					<CardDescription className="mt-1">
						間隔反復で作成済みカードを復習します
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<Button asChild className="w-full">
						<Link href="/learn">学習を始める</Link>
					</Button>
				</CardFooter>
			</Card>
			{/* Step 3: メモを取る */}
			<Card className="flex flex-col hover:shadow-lg transition-shadow">
				<CardHeader className="flex flex-col">
					<span className="text-sm text-gray-500">Step 3</span>
					<div className="flex items-center space-x-2 mt-2">
						<FileText className="h-6 w-6" />
						<CardTitle>メモを取る</CardTitle>
					</div>
					<CardDescription className="mt-1">
						用語ページを作成・編集して学習を補完します
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<Button asChild className="w-full">
						<Link href="/pages">メモ一覧へ</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
};
