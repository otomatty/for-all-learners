"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QuizFinished from "./QuizFinished";
import { recordLearningTime } from "@/app/_actions/actionLogs";
import type { FlashcardQuestion } from "@/lib/gemini";
import Link from "next/link";

interface FlashcardQuizProps {
	questions: FlashcardQuestion[];
	startTime: string;
}

export default function FlashcardQuiz({
	questions,
	startTime,
}: FlashcardQuizProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [showAnswer, setShowAnswer] = useState(false);
	const total = questions.length;
	const current = questions[currentIndex];
	const router = useRouter();
	const [timeRecorded, setTimeRecorded] = useState(false);
	const startedAt = Number(startTime);
	const finished = currentIndex >= total;

	useEffect(() => {
		if (finished && !timeRecorded) {
			const durationSec = Math.floor((Date.now() - startedAt) / 1000);
			recordLearningTime(durationSec);
			setTimeRecorded(true);
		}
	}, [finished, timeRecorded, startedAt]);

	const handleReveal = () => {
		setShowAnswer(true);
	};

	const handleNext = () => {
		setShowAnswer(false);
		if (currentIndex + 1 < total) {
			setCurrentIndex((prev) => prev + 1);
		} else {
			setCurrentIndex(total);
		}
	};

	if (finished) {
		return (
			<QuizFinished
				score={total}
				total={total}
				onFinish={() => router.push("/learn")}
			/>
		);
	}

	return (
		<div className="max-w-xl mx-auto p-4 space-y-4">
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
						? "次へ"
						: "完了"
					: "回答を見る"}
			</button>
		</div>
	);
}
