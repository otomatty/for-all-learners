"use client";

import React, { useState, useEffect } from "react";
import type { MultipleChoiceQuestion } from "@/lib/gemini";
import { useRouter } from "next/navigation";
import { recordLearningTime } from "@/app/_actions/actionLogs";
import { createLearningLog } from "@/app/_actions/learning_logs";
import QuizFinished from "./QuizFinished";

interface MultipleChoiceQuizProps {
	questions: (MultipleChoiceQuestion & {
		questionId: string;
		cardId: string;
	})[];
	startTime: string;
}

export default function MultipleChoiceQuiz({
	questions,
	startTime,
}: MultipleChoiceQuizProps) {
	const router = useRouter();
	const [timeRecorded, setTimeRecorded] = useState(false);
	const startedAt = Number(startTime);
	// Use enriched question type with questionId and cardId
	type EnrichedMCQ = MultipleChoiceQuestion & {
		questionId: string;
		cardId: string;
	};
	const [quizQuestions, setQuizQuestions] = useState<EnrichedMCQ[]>(
		questions as EnrichedMCQ[],
	);
	const [wrongAnswers, setWrongAnswers] = useState<
		{ question: MultipleChoiceQuestion; selectedIndex: number }[]
	>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [showAnswer, setShowAnswer] = useState(false);
	const [isFinished, setIsFinished] = useState(false);
	const [score, setScore] = useState(0);
	const total = quizQuestions.length;
	const currentQuestion = quizQuestions[currentIndex];

	// Log learning duration when quiz finishes
	useEffect(() => {
		if (isFinished && !timeRecorded) {
			const durationSec = Math.floor((Date.now() - startedAt) / 1000);
			recordLearningTime(durationSec);
			setTimeRecorded(true);
		}
	}, [isFinished, timeRecorded, startedAt]);

	// デバッグ: 質問データと現在の質問をログ出力
	useEffect(() => {
		console.debug("[MultipleChoiceQuiz] questions:", questions);
		console.debug("[MultipleChoiceQuiz] currentQuestion:", currentQuestion);
	}, [questions, currentQuestion]);

	const handleOptionClick = (index: number) => {
		if (showAnswer) return;
		setSelectedIndex(index);
		const isCorrect = index === currentQuestion.correctAnswerIndex;
		if (isCorrect) {
			setScore((prev) => prev + 1);
		}
		setShowAnswer(true);
	};

	const handleNext = async () => {
		// Record learning log for the answered question
		const isCorrect = selectedIndex === currentQuestion.correctAnswerIndex;
		const userAnswer =
			selectedIndex !== null ? currentQuestion.options[selectedIndex] : "";
		await createLearningLog({
			card_id: currentQuestion.cardId,
			question_id: currentQuestion.questionId,
			is_correct: isCorrect,
			user_answer: userAnswer,
			practice_mode: "mcq",
		});
		// Update wrong answers state if incorrect
		if (selectedIndex !== null && !isCorrect) {
			setWrongAnswers((prev) => [
				...prev,
				{ question: currentQuestion, selectedIndex },
			]);
		}
		setSelectedIndex(null);
		setShowAnswer(false);
		if (currentIndex + 1 < total) {
			setCurrentIndex((prev) => prev + 1);
		} else {
			setIsFinished(true);
		}
	};

	const handleRetryWrong = () => {
		const newQuestions = wrongAnswers.map((wa) => wa.question);
		setQuizQuestions(newQuestions as EnrichedMCQ[]);
		setWrongAnswers([]);
		setCurrentIndex(0);
		setSelectedIndex(null);
		setShowAnswer(false);
		setIsFinished(false);
		setScore(0);
	};

	if (isFinished) {
		const summary = wrongAnswers.map((wa) => ({
			prompt: wa.question.prompt,
			correctAnswer: wa.question.options[wa.question.correctAnswerIndex],
			yourAnswer: wa.question.options[wa.selectedIndex],
		}));
		return (
			<QuizFinished
				score={score}
				total={total}
				wrongAnswers={summary}
				onRetryWrong={handleRetryWrong}
				onFinish={() => router.push("/learn")}
			/>
		);
	}

	return (
		<div className="max-w-xl mx-auto">
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
