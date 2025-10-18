"use client";
import { FileText, Repeat, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { QuizSettingsDialog } from "@/components/quiz-settings-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Database } from "@/types/database.types";
import { DeckSelectionDialog } from "./deck-selection-dialog";

// 型定義: 復習対象カード数を含むデッキ型
type DeckWithDueCount = Database["public"]["Tables"]["decks"]["Row"] & {
	todayReviewCount: number;
};

interface QuickActionTilesProps {
	decks: DeckWithDueCount[];
}

export const QuickActionTiles: React.FC<QuickActionTilesProps> = ({
	decks,
}) => {
	// const [isQuickActionDialogOpen, setIsQuickActionDialogOpen] = useState(false);
	const [openDialog, setOpenDialog] = useState<"create" | "learn" | null>(null);

	// State for controlled QuizSettingsDialog
	const [quizDialog, setQuizDialog] = useState<{
		deckId: string;
		deckTitle?: string;
		reviewMode: boolean;
		reviewCount?: number;
	} | null>(null);
	const router = useRouter();

	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{/* Step 1: AI問題作成 */}
				<Card className="flex flex-col hover:shadow-lg transition-shadow">
					<CardHeader className="flex flex-col">
						<span className="text-sm text-gray-500">Step 1</span>
						<div className="flex items-center space-x-2 mt-2">
							<Sparkles className="h-6 w-6" />
							<CardTitle>問題を作成する</CardTitle>
						</div>
						<CardDescription className="mt-1">
							音読または画像から問題カードを自動生成します
						</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button
							variant="default"
							className="w-full"
							// onClick={() => setIsQuickActionDialogOpen(true)}
							onClick={() => setOpenDialog("create")}
						>
							問題を作成する
						</Button>
						<DeckSelectionDialog
							// open={isQuickActionDialogOpen}
							// onOpenChange={setIsQuickActionDialogOpen}
							open={openDialog === "create"}
							onOpenChange={(open) => setOpenDialog(open ? "create" : null)}
							dialogTitle="問題を作成する"
						/>
					</CardFooter>
				</Card>
				{/* Step 2: カード復習 */}
				<Card className="flex flex-col justify-between hover:shadow-lg transition-shadow">
					<CardHeader className="flex flex-col">
						<span className="text-sm text-gray-500">Step 2</span>
						<div className="flex items-center space-x-2 mt-2">
							<Repeat className="h-6 w-6" />
							<CardTitle>繰り返し学習する</CardTitle>
						</div>
						<CardDescription className="mt-1">
							間隔反復で作成済みカードを復習します
						</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button
							variant="default"
							className="w-full"
							// onClick={() => setIsQuickActionDialogOpen(true)}
							onClick={() => setOpenDialog("learn")}
						>
							学習を始める
						</Button>
						<DeckSelectionDialog
							// open={isQuickActionDialogOpen}
							// onOpenChange={setIsQuickActionDialogOpen}
							open={openDialog === "learn"}
							onOpenChange={(open) => setOpenDialog(open ? "learn" : null)}
							dialogTitle="学習を始める"
							// FSRS復習数付きデッキを渡す
							decks={decks}
							showActionButtons={false}
							renderActionButtons={({ selectedDeck, closeDialog }) => (
								<>
									<Button
										variant="default"
										className="w-full"
										onClick={() => {
											closeDialog();
											setQuizDialog({
												deckId: selectedDeck.id,
												deckTitle: selectedDeck.title,
												reviewMode: false,
											});
										}}
									>
										学習する
									</Button>
									<Button
										variant="outline"
										className="w-full"
										disabled={selectedDeck.todayReviewCount === 0}
										onClick={() => {
											closeDialog();
											setQuizDialog({
												deckId: selectedDeck.id,
												deckTitle: selectedDeck.title,
												reviewMode: true,
												reviewCount: selectedDeck.todayReviewCount,
											});
										}}
									>
										{`復習する (${selectedDeck.todayReviewCount})`}
									</Button>
								</>
							)}
						/>
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
						<Button asChild className="w-full cursor-default">
							<Link href="/pages">メモ一覧へ</Link>
						</Button>
					</CardFooter>
				</Card>
			</div>
			{/* Controlled QuizSettingsDialog */}
			{quizDialog && (
				<QuizSettingsDialog
					open={true}
					onOpenChange={() => setQuizDialog(null)}
					deckId={quizDialog.deckId}
					deckTitle={quizDialog.deckTitle}
					reviewMode={quizDialog.reviewMode}
					reviewCount={quizDialog.reviewCount}
				/>
			)}
		</>
	);
};
