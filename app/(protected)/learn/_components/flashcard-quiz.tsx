"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordLearningTime } from "@/app/_actions/actionLogs";
import { Progress } from "@/components/ui/progress";
import { useReviewCard } from "@/hooks/review";
import type { FlashcardQuestion } from "@/lib/gemini";
import QuizFinished, { type AnswerSummary } from "./quiz-finished";

interface FlashcardQuizProps {
	questions: (FlashcardQuestion & { questionId: string; cardId: string })[];
	startTime: string;
	timeLimit: number;
}

export default function FlashcardQuiz({
	questions,
	startTime,
	timeLimit,
}: FlashcardQuizProps) {
	const reviewCard = useReviewCard();
	const [results, setResults] = useState<{ cardId: string; quality: number }[]>(
		[],
	);
	const [questionSummaries, setQuestionSummaries] = useState<AnswerSummary[]>(
		[],
	);
	const [questionStartTime, setQuestionStartTime] = useState<number>(() =>
		Date.now(),
	);
	// track when the user revealed or auto-shows the answer
	const [answerTimestamp, setAnswerTimestamp] = useState<number | null>(null);
	// 残り時間を ms 単位で管理して滑らかに更新
	const expireTimeRef = useRef<number>(Date.now() + timeLimit * 1000);
	const [remainingMs, setRemainingMs] = useState<number>(timeLimit * 1000);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [showAnswer, setShowAnswer] = useState(false);
	const total = questions.length;
	const current = questions[currentIndex];
	const [timeRecorded, setTimeRecorded] = useState(false);
	const startedAt = Number(startTime);
	const finished = currentIndex >= total;

	// 質問開始時に expire 時刻を更新 (timeLimit変更時のみ)
	useEffect(() => {
		expireTimeRef.current = Date.now() + timeLimit * 1000;
		setRemainingMs(timeLimit * 1000);
	}, [timeLimit]);

	// 滑らかに残り時間を更新し、自動次へ
	useEffect(() => {
		if (finished || showAnswer) return;
		let frame: number;
		const update = () => {
			const diff = expireTimeRef.current - Date.now();
			if (diff <= 0) {
				setRemainingMs(0);
				// record expiry as answer time, then show answer
				setAnswerTimestamp(Date.now());
				setShowAnswer(true);
			} else {
				setRemainingMs(diff);
				frame = requestAnimationFrame(update);
			}
		};
		frame = requestAnimationFrame(update);
		return () => cancelAnimationFrame(frame);
	}, [showAnswer, finished]);

	useEffect(() => {
		if (finished && !timeRecorded) {
			const durationSec = Math.floor((Date.now() - startedAt) / 1000);
			recordLearningTime(durationSec);
			setTimeRecorded(true);
		}
	}, [finished, timeRecorded, startedAt]);

	useEffect(() => {
		if (finished) {
			results.forEach(({ cardId, quality }) => {
				reviewCard.mutate({
					cardId,
					quality,
					practiceMode: "one",
				});
			});
		}
	}, [finished, results, reviewCard]);

	const handleReveal = useCallback(() => {
		// record when user reveals answer
		setAnswerTimestamp(Date.now());
		setShowAnswer(true);
	}, []);

	const handleNext = useCallback(() => {
		// compute time until answer submission (excludes idle)
		const spent = Math.floor(
			((answerTimestamp ?? Date.now()) - questionStartTime) / 1000,
		);
		// reset answer timestamp for next question
		setAnswerTimestamp(null);
		setQuestionSummaries((prev) => [
			...prev,
			{
				prompt: current.question,
				yourAnswer: current.answer,
				correctAnswer: current.answer,
				timeSpent: spent,
			},
		]);
		// Flashcard は常に正解とみなし、quality=5
		setResults((prev) => [...prev, { cardId: current.cardId, quality: 5 }]);
		setShowAnswer(false);
		if (currentIndex + 1 < total) {
			setCurrentIndex((prev) => prev + 1);
			setQuestionStartTime(Date.now());
		} else {
			setCurrentIndex(total);
		}
	}, [
		answerTimestamp,
		questionStartTime,
		current.question,
		current.answer,
		current.cardId,
		currentIndex,
		total,
	]);

	// Keyboard navigation: Space/Enter to reveal or next when answer shown
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (!showAnswer) {
				if ([" ", "Enter"].includes(event.key)) {
					event.preventDefault();
					handleReveal();
				}
			} else {
				if ([" ", "Enter", "ArrowRight"].includes(event.key)) {
					event.preventDefault();
					handleNext();
				}
			}
		};
		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [showAnswer, handleReveal, handleNext]);

	if (finished) {
		return (
			<QuizFinished
				score={total}
				total={total}
				questionSummaries={questionSummaries}
			/>
		);
	}

	return (
		<div className="max-w-xl mx-auto p-4 space-y-4">
			<Progress
				value={(remainingMs / (timeLimit * 1000)) * 100}
				className="mb-2"
			/>
			<h3 className="text-xl font-semibold">
				問題 {currentIndex + 1} / {total}
			</h3>
			<p className="mt-2 text-lg">{current.question}</p>
			{showAnswer && (
				<p className="mt-4 text-lg text-blue-600">答え：{current.answer}</p>
			)}
			<button
				type="button"
				onClick={showAnswer ? handleNext : handleReveal}
				className="mt-4 px-4 py-2 bg-green-500 text-white rounded"
			>
				{showAnswer
					? currentIndex + 1 < total
						? "次へ (Space/Enter/→)"
						: "完了 (Space/Enter/→)"
					: "回答を見る"}
			</button>
		</div>
	);
}
