"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/app/(protected)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(protected)/dashboard/_components/dashboard-shell";
import { PracticeCard } from "@/components/practice/practice-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PracticeSessionPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const supabase = createClient();

	const deckId = searchParams.get("deckId");
	const mode = searchParams.get("mode") || "all";
	const answerType = searchParams.get("answerType") || "flashcard";

	const [cards, setCards] = useState([]);
	const [currentCardIndex, setCurrentCardIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [showAnswer, setShowAnswer] = useState(false);
	const [userAnswer, setUserAnswer] = useState("");
	const [isCorrect, setIsCorrect] = useState(null);
	const [sessionResults, setSessionResults] = useState({
		correct: 0,
		total: 0,
	});

	useEffect(() => {
		const fetchCards = async () => {
			if (!deckId) {
				router.push("/decks");
				return;
			}

			try {
				let query = supabase.from("cards").select("*").eq("deck_id", deckId);

				if (mode === "review") {
					// 復習モードの場合、復習が必要なカードのみを取得
					const { data: user } = await supabase.auth.getUser();
					if (user) {
						const { data: reviewCards } = await supabase
							.from("learning_logs")
							.select("card_id")
							.eq("user_id", user.data.user.id)
							.lte("next_review_at", new Date().toISOString());

						if (reviewCards && reviewCards.length > 0) {
							const cardIds = reviewCards.map((log) => log.card_id);
							query = query.in("id", cardIds);
						}
					}
				}

				const { data, error } = await query;

				if (error) {
					throw error;
				}

				if (data && data.length > 0) {
					// カードをシャッフル
					const shuffled = [...data].sort(() => 0.5 - Math.random());
					setCards(shuffled);
				} else {
					toast({
						title: "カードがありません",
						description:
							"このデッキにはカードがないか、復習が必要なカードがありません。",
						variant: "destructive",
					});
					router.push(`/decks/${deckId}`);
				}
			} catch (error) {
				console.error("Error fetching cards:", error);
				toast({
					title: "エラーが発生しました",
					description: "カードの取得中にエラーが発生しました。",
					variant: "destructive",
				});
			} finally {
				setLoading(false);
			}
		};

		fetchCards();
	}, [deckId, mode, router, supabase, toast]);

	const handleShowAnswer = () => {
		setShowAnswer(true);
	};

	const handleAnswer = async (correct) => {
		setIsCorrect(correct);

		// 学習記録を保存
		try {
			const { data: user } = await supabase.auth.getUser();
			if (user) {
				const currentCard = cards[currentCardIndex];

				// 学習ログを記録
				await supabase.from("learning_logs").insert({
					user_id: user.data.user.id,
					card_id: currentCard.id,
					answered_at: new Date().toISOString(),
					is_correct: correct,
					user_answer: userAnswer,
					practice_mode: mode,
					// 間隔反復のための次回復習日を計算
					review_interval: correct ? 2 : 1, // 正解なら2日後、不正解なら1日後
					next_review_at: new Date(
						Date.now() + (correct ? 2 : 1) * 24 * 60 * 60 * 1000,
					).toISOString(),
				});
			}
		} catch (error) {
			console.error("Error saving learning log:", error);
		}

		// セッション結果を更新
		setSessionResults((prev) => ({
			correct: prev.correct + (correct ? 1 : 0),
			total: prev.total + 1,
		}));

		// 次のカードへ進む準備
		setTimeout(() => {
			if (currentCardIndex < cards.length - 1) {
				setCurrentCardIndex((prev) => prev + 1);
				setShowAnswer(false);
				setUserAnswer("");
				setIsCorrect(null);
			} else {
				// 全てのカードが終了
				toast({
					title: "練習完了",
					description: `${sessionResults.correct}/${sessionResults.total}の正解率でした。`,
				});
				router.push(`/decks/${deckId}`);
			}
		}, 1500);
	};

	if (loading) {
		return (
			<DashboardShell>
				<div className="flex items-center justify-center h-[60vh]">
					<div className="text-center">
						<h2 className="text-xl font-semibold">カードを読み込み中...</h2>
					</div>
				</div>
			</DashboardShell>
		);
	}

	if (cards.length === 0) {
		return (
			<DashboardShell>
				<div className="flex items-center justify-center h-[60vh]">
					<div className="text-center">
						<h2 className="text-xl font-semibold">カードがありません</h2>
						<p className="text-muted-foreground mt-2">
							このデッキにはカードがないか、復習が必要なカードがありません。
						</p>
						<Button
							className="mt-4"
							onClick={() => router.push(`/decks/${deckId}`)}
						>
							デッキに戻る
						</Button>
					</div>
				</div>
			</DashboardShell>
		);
	}

	const currentCard = cards[currentCardIndex];

	return (
		<DashboardShell>
			<DashboardHeader
				heading={`問題 ${currentCardIndex + 1}/${cards.length}`}
				text={`正解: ${sessionResults.correct} / 全体: ${sessionResults.total}`}
			/>
			<PracticeCard
				card={currentCard}
				showAnswer={showAnswer}
				onShowAnswer={handleShowAnswer}
				onAnswer={handleAnswer}
				answerType={answerType}
				userAnswer={userAnswer}
				setUserAnswer={setUserAnswer}
				isCorrect={isCorrect}
			/>
		</DashboardShell>
	);
}
