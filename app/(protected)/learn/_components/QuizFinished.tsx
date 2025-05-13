"use client";

import { Confetti } from "@/components/magicui/confetti";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";

// Summary type for all practiced questions including time spent
export interface AnswerSummary {
	prompt: string;
	correctAnswer: string;
	yourAnswer: string;
	timeSpent: number;
}

interface QuizFinishedProps {
	score: number;
	total: number;
	questionSummaries: AnswerSummary[];
}

export default function QuizFinished({
	score,
	total,
	questionSummaries,
}: QuizFinishedProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();
	// build new query params preserving settings and new startTime
	const params = new URLSearchParams(searchParams.toString());
	params.set("startTime", Date.now().toString());
	const goHome = () => router.push("/dashboard");
	const continueQuiz = () => {
		router.push(`${pathname}?${params.toString()}`);
	};
	return (
		<>
			<Confetti className="fixed inset-0 pointer-events-none" />
			<div className="relative z-10 max-w-md mx-auto bg-white md:rounded-lg md:shadow-lg md:p-6 space-y-6">
				<h2 className="text-3xl font-bold">クイズ完了！</h2>
				<p className="text-lg">
					合計 {total} 問中 <span className="font-semibold">{score}</span>{" "}
					問正解しました。
				</p>

				<div className="text-left space-y-4">
					<h3 className="text-xl font-semibold">演習した問題一覧</h3>
					<ul className="space-y-4">
						{questionSummaries.map((wa) => (
							<li key={wa.prompt} className="border p-4 rounded">
								<p className="font-medium">問題：{wa.prompt}</p>
								<p>
									あなたの回答：
									<span className="text-red-500">{wa.yourAnswer}</span>
								</p>
								<p>
									正解：
									<span className="text-green-500">{wa.correctAnswer}</span>
								</p>
								<p>所要時間：{wa.timeSpent}秒</p>
							</li>
						))}
					</ul>
				</div>

				<div className="flex justify-end space-x-2 mt-4">
					<button
						type="button"
						className="px-4 py-2 bg-gray-500 text-white rounded"
						onClick={goHome}
					>
						ホームに戻る
					</button>
					<button
						type="button"
						className="px-4 py-2 bg-blue-500 text-white rounded"
						onClick={continueQuiz}
					>
						学習を続ける
					</button>
				</div>
			</div>
		</>
	);
}
