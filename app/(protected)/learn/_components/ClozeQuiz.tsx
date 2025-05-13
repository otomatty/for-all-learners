"use client";

import { recordLearningTime } from "@/app/_actions/actionLogs";
import { reviewCard } from "@/app/_actions/review";
import { Progress } from "@/components/ui/progress";
import type { ClozeQuestion } from "@/lib/gemini";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import QuizFinished, { type AnswerSummary } from "./QuizFinished";

interface ClozeQuizProps {
	questions: (ClozeQuestion & { questionId: string; cardId: string })[];
	startTime: string;
	timeLimit: number;
}

/**
 * Cloze (穴埋め) クイズコンポーネント
 * @param questions - ClozeQuestion の配列
 */
export default function ClozeQuiz({
	questions,
	startTime,
	timeLimit,
}: ClozeQuizProps) {
	// 各カードのレビュー結果を蓄積
	const [results, setResults] = useState<{ cardId: string; quality: number }[]>(
		[],
	);
	// Hooks: always at top
	const total = questions.length;
	const [currentIndex, setCurrentIndex] = useState(0);
	const [showResult, setShowResult] = useState(false);
	const [timeRecorded, setTimeRecorded] = useState(false);
	const startedAtMs = Number(startTime);
	const finished = currentIndex >= total;
	// 残り時間を ms 単位で管理して滑らかに更新
	const expireTimeRef = useRef<number>(Date.now() + timeLimit * 1000);
	const [remainingMs, setRemainingMs] = useState<number>(timeLimit * 1000);
	// Track summary of each practiced question
	const [questionSummaries, setQuestionSummaries] = useState<AnswerSummary[]>(
		[],
	);
	// Timestamp when current question started
	const [questionStartTime, setQuestionStartTime] = useState<number>(() =>
		Date.now(),
	);
	// track when the user submitted or time expired
	const [answerTimestamp, setAnswerTimestamp] = useState<number | null>(null);

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
				questionSummaries={questionSummaries}
			/>
		);
	}

	// 質問開始時に expire 時刻を更新 (timeLimit変更時のみ)
	useEffect(() => {
		expireTimeRef.current = Date.now() + timeLimit * 1000;
		setRemainingMs(timeLimit * 1000);
	}, [timeLimit]);

	// requestAnimationFrame ベースで残り時間を ms 単位で滑らかに更新し、自動次へ
	useEffect(() => {
		if (finished || showResult) return;
		let frame: number;
		const update = () => {
			const diff = expireTimeRef.current - Date.now();
			if (diff <= 0) {
				setRemainingMs(0);
				// record expiry as answer time, then show results
				setAnswerTimestamp(Date.now());
				setShowResult(true);
			} else {
				setRemainingMs(diff);
				frame = requestAnimationFrame(update);
			}
		};
		frame = requestAnimationFrame(update);
		return () => cancelAnimationFrame(frame);
	}, [showResult, finished]);

	// Review results on finish
	useEffect(() => {
		if (finished) {
			(async () => {
				await Promise.all(
					results.map(({ cardId, quality }) =>
						reviewCard(cardId, quality, "fill"),
					),
				);
			})();
		}
	}, [finished, results.map]);

	// 回答確認・次へ処理 (stable via useCallback)
	const handleCheck = useCallback(() => {
		const now = Date.now();
		setAnswerTimestamp(now);
		setShowResult(true);
	}, []);
	const handleNext = useCallback(() => {
		// compute time until answer submission (excludes idle)
		const spent = Math.floor(
			((answerTimestamp ?? Date.now()) - questionStartTime) / 1000,
		);
		setQuestionSummaries((prev) => [
			...prev,
			{
				prompt: current.question,
				yourAnswer: inputs.join(", "),
				correctAnswer: answersList.join(", "),
				timeSpent: spent,
			},
		]);
		// reset answer timestamp for next question
		setAnswerTimestamp(null);
		const isCorrect = blanksList.every(
			(_blank, idx) => inputs[idx]?.trim() === answersList[idx]?.trim(),
		);
		// 結果をバッファに追加
		setResults((prev) => [
			...prev,
			{ cardId: current.cardId, quality: isCorrect ? 5 : 2 },
		]);
		const next = currentIndex + 1;
		if (next < total) {
			setCurrentIndex(next);
			setShowResult(false);
			// Reset start time for next question
			setQuestionStartTime(Date.now());
		} else {
			setCurrentIndex(total);
		}
	}, [
		blanksList,
		inputs,
		answersList,
		current.question,
		current.cardId,
		currentIndex,
		total,
		questionStartTime,
		answerTimestamp,
	]);

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
			// wrap text part with span to assign unique key
			parts.push(
				<span key={`text-${current.questionId}-${idx}`}>{before}</span>,
			);
			// input part with question-specific key
			parts.push(
				<input
					key={`input-${current.questionId}-${idx}`}
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
				/>,
			);
			remainingText = after;
		});
		// wrap final remaining text
		parts.push(
			<span key={`text-${current.questionId}-last`}>{remainingText}</span>,
		);
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
			{/* プログレスバーで残り時間を視覚化 */}
			<Progress
				value={(remainingMs / (timeLimit * 1000)) * 100}
				className="mb-2"
			/>
			<h3 className="text-xl font-semibold">
				問題 {currentIndex + 1} / {total}
			</h3>
			<p className="mt-2 text-lg">{parts}</p>
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
