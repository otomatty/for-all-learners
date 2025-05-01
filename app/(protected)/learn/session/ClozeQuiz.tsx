"use client";

import React, { useState, useEffect } from "react";
import type { ClozeQuestion } from "@/lib/gemini";
import { createLearningLog } from "@/app/_actions/learning_logs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QuizFinished from "./QuizFinished";
import { recordLearningTime } from "@/app/_actions/actionLogs";

interface ClozeQuizProps {
	questions: (ClozeQuestion & { questionId: string; cardId: string })[];
	startTime: string;
}

/**
 * Cloze (穴埋め) クイズコンポーネント
 * @param questions - ClozeQuestion の配列
 */
export default function ClozeQuiz({ questions, startTime }: ClozeQuizProps) {
	// Hooks: always at top
	const total = questions.length;
	const [currentIndex, setCurrentIndex] = useState(0);
	const [showResult, setShowResult] = useState(false);
	const router = useRouter();
	const [timeRecorded, setTimeRecorded] = useState(false);
	const startedAtMs = Number(startTime);
	const finished = currentIndex >= total;

	// Determine current question safely
	const current = questions[currentIndex] ?? {
		text: "",
		blanks: [],
		question: "",
		answers: [],
	};
	const { text, blanks, answers } = current;

	// Debug: log questions and current question detail
	useEffect(() => {
		console.debug("[ClozeQuiz] questions:", questions);
		console.debug("[ClozeQuiz] currentIndex:", currentIndex);
		console.debug("[ClozeQuiz] current:", current);
	}, [questions, currentIndex, current]);

	// Prepare safe data lists and log errors if data is invalid
	const blanksList = Array.isArray(blanks) ? blanks : [];
	if (!Array.isArray(blanks))
		console.error("[ClozeQuiz] Invalid blanks for question:", current);
	const answersList = Array.isArray(answers) ? answers : [];
	if (!Array.isArray(answers))
		console.error("[ClozeQuiz] Invalid answers for question:", current);
	if (blanksList.length !== answersList.length)
		console.error("[ClozeQuiz] Mismatch blanks/answers length:", {
			blanksList,
			answersList,
		});

	// Manage inputs: always call hooks unconditionally using safe lists
	const [inputs, setInputs] = useState<string[]>(() =>
		Array(blanksList.length).fill(""),
	);
	useEffect(() => {
		setInputs(Array(blanksList.length).fill(""));
		setShowResult(false);
	}, [blanksList.length]);

	// Guards after hooks
	if (total === 0) {
		return (
			<div className="p-4 text-center text-red-500">問題が見つかりません。</div>
		);
	}
	if (finished) {
		// Display quiz finished UI and onFinish navigate back
		return (
			<QuizFinished
				score={0}
				total={total}
				wrongAnswers={[]}
				onFinish={() => router.push("/learn")}
			/>
		);
	}

	// 回答確認・次へ処理
	const handleCheck = () => setShowResult(true);
	const handleNext = async () => {
		// Record learning log for current cloze question
		const userAnswer = inputs.join(",");
		const isCorrect = blanksList.every(
			(_blank, idx) => inputs[idx]?.trim() === answersList[idx]?.trim(),
		);
		await createLearningLog({
			card_id: current.cardId,
			question_id: current.questionId,
			is_correct: isCorrect,
			user_answer: userAnswer,
			practice_mode: "fill",
		});
		const next = currentIndex + 1;
		if (next < total) {
			setCurrentIndex(next);
			setShowResult(false);
		} else {
			setCurrentIndex(total);
		}
	};

	// Prepare parts with error handling
	let parts: React.ReactNode[];
	try {
		parts = [];
		let remainingText = text;
		blanksList.forEach((blank, idx) => {
			// Check blank existence in text
			if (!remainingText.includes(blank)) {
				console.error("[ClozeQuiz] Blank not found in text:", {
					blank,
					remainingText,
					current,
				});
				throw new Error(`Blank "${blank}" not present in text at index ${idx}`);
			}
			const [before, after] = remainingText.split(blank);
			parts.push(before);
			// eslint-disable-next-line react/no-array-index-key
			parts.push(
				<input
					key={`blank-${idx}`}
					type="text"
					value={inputs[idx] || ""}
					disabled={showResult}
					onChange={(e) => {
						const next = [...inputs];
						next[idx] = e.target.value;
						setInputs(next);
					}}
					className="border-b border-gray-400 focus:outline-none mx-1 w-24"
					placeholder="…"
				/>, // eslint-disable-line react/no-array-index-key
			);
			remainingText = after;
		});
		parts.push(remainingText);
	} catch (error) {
		console.error("[ClozeQuiz] Error rendering blanks:", error, current);
		return (
			<div className="p-4 text-center text-red-500">
				クイズの表示中にエラーが発生しました:{" "}
				{error instanceof Error ? error.message : String(error)}
				コンソールを確認してください。
			</div>
		);
	}

	// Record learning time when finished; include all dependencies
	useEffect(() => {
		if (finished && !timeRecorded) {
			const durationSec = Math.floor((Date.now() - startedAtMs) / 1000);
			recordLearningTime(durationSec);
			setTimeRecorded(true);
		}
	}, [finished, timeRecorded, startedAtMs]);

	return (
		<div className="max-w-xl mx-auto p-4 space-y-4">
			<h3 className="text-xl font-semibold">
				問題 {currentIndex + 1} / {total}
			</h3>
			<p className="mt-2 text-lg">
				{parts.map((part, idx) => (
					<React.Fragment key={`part-${idx}`}>{part}</React.Fragment>
				))}
			</p>
			{!showResult ? (
				<button
					type="button"
					onClick={handleCheck}
					className="mt-4 px-4 py-2 bg-green-500 text-white rounded"
				>
					回答を確認
				</button>
			) : (
				<div className="space-y-2">
					<p className="text-sm text-gray-600">
						正解: {answersList.join(", ")}
					</p>
					<button
						type="button"
						onClick={handleNext}
						className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
					>
						{currentIndex + 1 < total ? "次へ" : "完了"}
					</button>
				</div>
			)}
		</div>
	);
}
