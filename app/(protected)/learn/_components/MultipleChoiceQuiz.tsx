"use client";

import { recordLearningTime } from "@/app/_actions/actionLogs";
import { reviewCard } from "@/app/_actions/review";
import { Progress } from "@/components/ui/progress";
import type { MultipleChoiceQuestion } from "@/lib/gemini";
import React, { useState, useEffect, useRef } from "react";
import QuizFinished, { type AnswerSummary } from "./QuizFinished";

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
		<div className="max-w-xl mx-auto">
			{/* プログレスバーで残り時間を表示 */}
			<Progress
				value={(remainingMs / (timeLimit * 1000)) * 100}
				className="mb-2"
			/>
			{/* 問題文 */}
			<div className="mb-4">
				<h3 className="text-xl font-semibold">
					問題 {currentIndex + 1} / {total}
				</h3>
				<p className="mt-2 text-lg font-medium">{currentQuestion.question}</p>
			</div>
			{/* 選択肢 */}
			<div className="grid grid-cols-1 gap-4">
				{currentQuestion.options.map((option, idx) => {
					const isSelected = idx === selectedIndex;
					const isCorrectOption = idx === currentQuestion.correctAnswerIndex;
					let bgClass = "bg-white hover:bg-gray-100";
					if (showAnswer) {
						if (isCorrectOption) {
							bgClass = "bg-green-200";
						} else if (isSelected && !isCorrectOption) {
							bgClass = "bg-red-200";
						}
					}
					return (
						<button
							key={option}
							type="button"
							className={`w-full text-left p-3 border rounded ${bgClass}`}
							onClick={() => handleOptionClick(idx)}
							disabled={showAnswer}
						>
							{option}
						</button>
					);
				})}
			</div>
			{/* 正解/不正解マークと説明文 */}
			{showAnswer && (
				<div className="mt-4 text-center">
					{selectedIndex === currentQuestion.correctAnswerIndex ? (
						<div className="text-5xl text-green-500">〇</div>
					) : (
						<div className="text-5xl text-red-500">×</div>
					)}
					<p className="mt-2 text-sm text-gray-700">
						{currentQuestion.explanation}
					</p>
				</div>
			)}
			<div className="mt-4 flex justify-end">
				<button
					type="button"
					className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
					onClick={handleNext}
					disabled={!showAnswer}
				>
					{currentIndex + 1 < total ? "Next" : "Finish"}
				</button>
			</div>
		</div>
	);
}
