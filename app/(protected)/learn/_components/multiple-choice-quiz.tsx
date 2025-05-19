"use client";

import { recordLearningTime } from "@/app/_actions/actionLogs";
import { reviewCard } from "@/app/_actions/review";
import { Progress } from "@/components/ui/progress";
import type { MultipleChoiceQuestion } from "@/lib/gemini";
import React, { useState, useEffect, useRef } from "react";
import QuizFinished, { type AnswerSummary } from "./quiz-finished";
import { Container } from "@/components/container";
import {
	Card,
	CardHeader,
	CardContent,
	CardFooter,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface MultipleChoiceQuizProps {
	questions: (MultipleChoiceQuestion & {
		questionId: string;
		cardId: string;
	})[];
	startTime: string;
	timeLimit: number;
}

export default function MultipleChoiceQuiz({
	questions,
	startTime,
	timeLimit,
}: MultipleChoiceQuizProps) {
	const [results, setResults] = useState<{ cardId: string; quality: number }[]>(
		[],
	);
	const [questionSummaries, setQuestionSummaries] = useState<AnswerSummary[]>(
		[],
	);
	const [questionStartTime, setQuestionStartTime] = useState<number>(() =>
		Date.now(),
	);
	const [timeRecorded, setTimeRecorded] = useState(false);
	const startedAt = Number(startTime);
	// Use enriched question type with questionId and cardId
	type EnrichedMCQ = MultipleChoiceQuestion & {
		questionId: string;
		cardId: string;
	};
	// Shuffle helper to randomize options and update correctAnswerIndex
	const shuffleQuestions = (qs: EnrichedMCQ[]): EnrichedMCQ[] => {
		return qs.map((q) => {
			// pair options with original indices
			const indexed = q.options.map((opt, idx) => ({ opt, idx }));
			// Fisher–Yates shuffle
			for (let i = indexed.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[indexed[i], indexed[j]] = [indexed[j], indexed[i]];
			}
			// extract new options and compute new correct index
			const newOptions = indexed.map((o) => o.opt);
			const newCorrect = indexed.findIndex(
				(o) => o.idx === q.correctAnswerIndex,
			);
			return { ...q, options: newOptions, correctAnswerIndex: newCorrect };
		});
	};
	// initialize with shuffled options for each question
	const [quizQuestions, setQuizQuestions] = useState<EnrichedMCQ[]>(() =>
		shuffleQuestions(questions as EnrichedMCQ[]),
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [showAnswer, setShowAnswer] = useState(false);
	const [isFinished, setIsFinished] = useState(false);
	const [score, setScore] = useState(0);
	const total = quizQuestions.length;
	const currentQuestion = quizQuestions[currentIndex];
	// 残り時間を ms 単位で管理して滑らかに更新
	const expireTimeRef = useRef<number>(Date.now() + timeLimit * 1000);
	const [remainingMs, setRemainingMs] = useState<number>(timeLimit * 1000);
	const remaining = Math.ceil(remainingMs / 1000);
	// track when the user answered or time expired
	const [answerTimestamp, setAnswerTimestamp] = useState<number | null>(null);

	// Keyboard navigation
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (showAnswer) return; // Don't process key presses if answer is shown

			const keyNum = Number.parseInt(event.key, 10);
			if (keyNum >= 1 && keyNum <= 4) {
				// Check if the number of options is less than the key pressed
				if (keyNum <= currentQuestion.options.length) {
					handleOptionClick(keyNum - 1);
				}
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => {
			window.removeEventListener("keydown", handleKeyPress);
		};
	}, [showAnswer, currentQuestion.options]); // Re-run if showAnswer or options change

	// Log learning duration when quiz finishes
	useEffect(() => {
		if (isFinished && !timeRecorded) {
			const durationSec = Math.floor((Date.now() - startedAt) / 1000);
			recordLearningTime(durationSec);
			setTimeRecorded(true);
		}
	}, [isFinished, timeRecorded, startedAt]);

	// 質問開始時（timeLimit変更時）に expire 時刻を更新
	useEffect(() => {
		expireTimeRef.current = Date.now() + timeLimit * 1000;
		setRemainingMs(timeLimit * 1000);
	}, [timeLimit]);

	// 滑らかに残り時間を更新し、自動次へ (lint: ignore exhaustive-deps)
	useEffect(() => {
		if (isFinished || showAnswer) return;
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
	}, [showAnswer, isFinished]);

	const handleOptionClick = (index: number) => {
		if (showAnswer) return;
		setSelectedIndex(index);
		const isCorrect = index === currentQuestion.correctAnswerIndex;
		if (isCorrect) {
			setScore((prev) => prev + 1);
		}
		// record when user answered
		const now = Date.now();
		setAnswerTimestamp(now);
		setShowAnswer(true);
	};

	function handleNext() {
		// compute time until answer submission (excludes idle)
		const spent = Math.floor(
			((answerTimestamp ?? Date.now()) - questionStartTime) / 1000,
		);
		// reset answer timestamp for next question
		setAnswerTimestamp(null);
		setQuestionSummaries((prev) => [
			...prev,
			{
				prompt: currentQuestion.question,
				yourAnswer: currentQuestion.options[selectedIndex ?? 0],
				correctAnswer:
					currentQuestion.options[currentQuestion.correctAnswerIndex],
				timeSpent: spent,
			},
		]);
		// Record quality
		const isCorrect = selectedIndex === currentQuestion.correctAnswerIndex;
		setResults((prev) => [
			...prev,
			{ cardId: currentQuestion.cardId, quality: isCorrect ? 5 : 2 },
		]);
		setSelectedIndex(null);
		setShowAnswer(false);
		if (currentIndex + 1 < total) {
			setCurrentIndex((prev) => prev + 1);
			setQuestionStartTime(Date.now());
			// reset timer for next question
			expireTimeRef.current = Date.now() + timeLimit * 1000;
			setRemainingMs(timeLimit * 1000);
		} else {
			setIsFinished(true);
		}
	}

	// On finish, perform review and render summary
	useEffect(() => {
		if (isFinished) {
			(async () => {
				await Promise.all(
					results.map(({ cardId, quality }) =>
						reviewCard(cardId, quality, "mcq"),
					),
				);
			})();
		}
	}, [isFinished, results]);
	if (isFinished) {
		return (
			<QuizFinished
				score={score}
				total={total}
				questionSummaries={questionSummaries}
			/>
		);
	}

	return (
		<Container className="py-12">
			<Card className="max-w-xl mx-auto">
				<CardHeader className="space-y-2">
					<Progress
						value={(remainingMs / (timeLimit * 1000)) * 100}
						className="w-full"
					/>
					<CardTitle className="text-xl font-semibold">
						問題 {currentIndex + 1} / {total}
					</CardTitle>
					<CardDescription className="text-lg font-medium">
						{currentQuestion.question}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 gap-4">
						{currentQuestion.options.map((option, idx) => {
							const isSelected = idx === selectedIndex;
							const isCorrectOption =
								idx === currentQuestion.correctAnswerIndex;
							let bgClass = "bg-white hover:bg-gray-100";
							if (showAnswer) {
								if (isCorrectOption) {
									bgClass = "bg-green-200";
								} else if (isSelected && !isCorrectOption) {
									bgClass = "bg-red-200";
								}
							}
							return (
								<Button
									key={option}
									variant="outline"
									className={`w-full justify-start text-left p-3 border rounded ${bgClass} whitespace-normal h-auto`}
									onClick={() => handleOptionClick(idx)}
									disabled={showAnswer}
								>
									{`${idx + 1}. ${option}`}
								</Button>
							);
						})}
					</div>
					{showAnswer && (
						<div className="text-center space-y-2 mt-4">
							{selectedIndex === currentQuestion.correctAnswerIndex ? (
								<CircleCheck className="mx-auto w-12 h-12 text-green-500" />
							) : (
								<CircleX className="mx-auto w-12 h-12 text-red-500" />
							)}
							<div className="text-sm text-gray-700 p-4 border rounded-md bg-gray-50 text-left prose prose-sm max-w-none">
								<ReactMarkdown>{currentQuestion.explanation}</ReactMarkdown>
							</div>
						</div>
					)}
				</CardContent>
				<CardFooter className="flex justify-end">
					<Button onClick={handleNext} disabled={!showAnswer}>
						{currentIndex + 1 < total ? "Next" : "Finish"}
					</Button>
				</CardFooter>
			</Card>
		</Container>
	);
}
