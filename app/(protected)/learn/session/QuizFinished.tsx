"use client";

import React from "react";
import { Confetti } from "@/components/magicui/confetti";

// Summary type for wrong answers
interface AnswerSummary {
	prompt: string;
	correctAnswer: string;
	yourAnswer: string;
}

interface QuizFinishedProps {
	score: number;
	total: number;
	wrongAnswers?: AnswerSummary[];
	onRetryWrong?: () => void;
	onFinish?: () => void;
}

export default function QuizFinished({
	score,
	total,
	wrongAnswers = [],
	onRetryWrong,
	onFinish,
}: QuizFinishedProps) {
	return (
		<>
			<Confetti className="fixed inset-0 pointer-events-none" />
			<div className="relative z-10 max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 space-y-6">
				<h2 className="text-3xl font-bold">クイズ完了！</h2>
				<p className="text-lg">
					合計 {total} 問中 <span className="font-semibold">{score}</span>{" "}
					問正解しました。
				</p>

				{wrongAnswers.length > 0 ? (
					<div className="text-left space-y-4">
						<h3 className="text-xl font-semibold">間違えた問題の復習</h3>
						<ul className="space-y-4">
							{wrongAnswers.map((wa, idx) => (
								<li key={wa.prompt} className="border p-4 rounded bg-red-50">
									<p className="font-medium">問題：{wa.prompt}</p>
									<p>
										あなたの回答：
										<span className="text-red-500">{wa.yourAnswer}</span>
									</p>
									<p>
										正解：
										<span className="text-green-500">{wa.correctAnswer}</span>
									</p>
								</li>
							))}
						</ul>
						<button
							type="button"
							className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded"
							onClick={onRetryWrong}
						>
							間違えた問題に再チャレンジ
						</button>
					</div>
				) : (
					<div className="space-y-4">
						<p className="text-lg text-green-600">
							満点です！おめでとうございます！
						</p>
					</div>
				)}
				{onFinish && (
					<button
						type="button"
						className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
						onClick={onFinish}
					>
						学習ページに戻る
					</button>
				)}
			</div>
		</>
	);
}
