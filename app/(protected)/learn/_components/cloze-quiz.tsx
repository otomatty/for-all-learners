"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { recordLearningTime } from "@/app/_actions/actionLogs";
import { reviewCard } from "@/app/_actions/review";
import { Progress } from "@/components/ui/progress";
import type { ClozeQuestion } from "@/lib/gemini";
import QuizFinished, { type AnswerSummary } from "./quiz-finished";

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
	// ユーザーが各空欄で選択した選択肢を保持 (undefined は未選択)
	const [selectedOptions, setSelectedOptions] = useState<
		(string | undefined)[]
	>([]);

	// Determine current question safely
	const current = questions[currentIndex] ?? {
		text: "",
		blanks: [],
		question: "",
		answers: [],
		options: [], // 初期値に options を追加
	};
	const { text, blanks, answers, options } = current;

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
	// const [inputs, setInputs] = useState<string[]>(() =>
	// Array(blanksList.length).fill(""),
	// );
	useEffect(() => {
		// setInputs(Array(blanksList.length).fill(""));
		setSelectedOptions(Array(blanksList.length).fill(undefined)); // 選択肢をリセット
		setShowResult(false);
	}, [blanksList.length]);

	// Guards after hooks
	if (total === 0) {
		return (
			<div className="p-4 text-center text-red-500">問題が見つかりません。</div>
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
				yourAnswer: selectedOptions.map((opt) => opt ?? "-").join(", "), // selectedOptions を使用
				correctAnswer: answersList.join(", "),
				timeSpent: spent,
			},
		]);
		// reset answer timestamp for next question
		setAnswerTimestamp(null);
		const isCorrect = blanksList.every(
			(_blank, idx) => selectedOptions[idx] === answersList[idx], // selectedOptions を使用
		);
		// 結果をバッファに追加
		setResults((prev) => [
			...prev,
			{ cardId: current.cardId, quality: isCorrect ? 5 : 2 },
		]);
		const next = currentIndex + 1;
		if (next < total) {
			expireTimeRef.current = Date.now() + timeLimit * 1000; // Reset timer
			setRemainingMs(timeLimit * 1000); // Reset timer
			setCurrentIndex(next);
			setShowResult(false);
			// Reset start time for next question
			setQuestionStartTime(Date.now());
		} else {
			setCurrentIndex(total);
		}
	}, [
		blanksList,
		// inputs, // inputs を削除
		selectedOptions, // selectedOptions を追加
		answersList,
		current.question,
		current.cardId,
		currentIndex,
		total,
		questionStartTime,
		answerTimestamp,
		timeLimit, // timeLimit を依存配列に追加
	]);

	// Keyboard navigation: Space/Enter to check or next when result shown
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (!showResult) {
				if ([" ", "Enter"].includes(event.key)) {
					event.preventDefault();
					handleCheck();
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
	}, [showResult, handleCheck, handleNext]);

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
				<span key={`text-before-${current.questionId}-${idx}-${blank}`}>
					{before}
				</span>,
			);
			// input part with question-specific key
			// 選択肢ボタンに変更
			const blankOptions = options?.[idx] ?? [];
			if (blankOptions.length === 0) {
				console.warn(
					`[ClozeQuiz] No options for blank ${idx} in question:`,
					current,
				);
			}

			parts.push(
				<div
					key={`options-container-${current.questionId}-${idx}`}
					className="inline-block mx-1"
				>
					{showResult ? (
						<span
							className={`px-2 py-1 rounded ${
								selectedOptions[idx] === answersList[idx]
									? "bg-green-200 text-green-800"
									: "bg-red-200 text-red-800"
							}`}
						>
							{selectedOptions[idx] ?? "未選択"}
						</span>
					) : blankOptions.length > 0 ? (
						blankOptions.map((option, optionIdx) => (
							<button
								key={`option-${current.questionId}-${idx}-${optionIdx}-${option}`}
								type="button"
								disabled={showResult}
								onClick={() => {
									const newSelectedOptions = [...selectedOptions];
									newSelectedOptions[idx] = option;
									setSelectedOptions(newSelectedOptions);
								}}
								className={`border rounded px-2 py-1 m-0.5 text-sm ${
									selectedOptions[idx] === option
										? "bg-blue-500 text-white"
										: "bg-gray-100 hover:bg-gray-200"
								} ${showResult ? "cursor-not-allowed" : ""}`}
							>
								{option}
							</button>
						))
					) : (
						<span className="text-red-500 text-sm">(選択肢なし)</span>
					)}
				</div>,
			);
			remainingText = after;
		});
		// wrap final remaining text
		parts.push(
			<span key={`text-after-${current.questionId}-last`}>
				{remainingText}
			</span>,
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

	// クイズが終了している場合は、結果表示コンポーネントをレンダリング
	if (finished) {
		return (
			<QuizFinished
				score={0} // score は別途計算が必要な場合は修正
				total={total}
				questionSummaries={questionSummaries}
			/>
		);
	}

	// Display results or controls (クイズ実行中のレンダリング)
	return (
		<div className="max-w-xl mx-auto my-4">
			<Progress
				value={(remainingMs / (timeLimit * 1000)) * 100}
				className="mb-4"
			/>
			<div className="text-center">
				<h3 className="text-xl font-semibold mb-2">{current.question}</h3>
				<div className="mt-2 text-lg leading-loose">
					{parts.map((part, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<React.Fragment key={i}>{part}</React.Fragment>
					))}
				</div>
			</div>
			<div className="flex justify-center items-center mt-4 space-x-2">
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
							{blanksList.map((blankItem, idx) => (
								<span
									key={`answer-detail-${idx}-${blankItem}`}
									className="ml-2"
								>
									空欄{idx + 1}: {answersList[idx]}
									{selectedOptions[idx] !== answersList[idx] && (
										<span className="text-red-500">
											(あなたの回答: {selectedOptions[idx] ?? "未選択"})
										</span>
									)}
								</span>
							))}
						</p>
						<button
							type="button"
							onClick={handleNext}
							className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
						>
							{currentIndex + 1 < total
								? "次へ (Space/Enter/→)"
								: "完了 (Space/Enter/→)"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
