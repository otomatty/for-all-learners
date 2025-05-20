"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { Container } from "@/components/container";
import {
	Card,
	CardHeader,
	CardContent,
	CardFooter,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { CircleCheck, CircleX } from "lucide-react";

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
	onRetryWrong?: () => void;
}

export default function QuizFinished({
	score,
	total,
	questionSummaries,
	onRetryWrong,
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
	// Determine if there are any wrong answers
	const hasWrong = questionSummaries.some(
		(ws) => ws.yourAnswer !== ws.correctAnswer,
	);
	useEffect(() => {
		const end = Date.now() + 3 * 1000;
		const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
		const frame = () => {
			if (Date.now() > end) return;
			confetti({
				particleCount: 2,
				angle: 60,
				spread: 55,
				startVelocity: 60,
				origin: { x: 0, y: 0.5 },
				colors,
			});
			confetti({
				particleCount: 2,
				angle: 120,
				spread: 55,
				startVelocity: 60,
				origin: { x: 1, y: 0.5 },
				colors,
			});
			requestAnimationFrame(frame);
		};
		frame();
	}, []);
	return (
		<>
			{/* confetti side cannons effect on mount */}
			<Container className="relative z-10 py-12">
				<Card className="mx-auto max-w-3xl">
					<CardHeader className="text-center">
						<CardTitle className="text-3xl md:text-4xl">
							🎉 クイズ完了！
						</CardTitle>
						<CardDescription className="mt-2 text-lg">
							合計 {total} 問中 <span className="font-semibold">{score}</span>{" "}
							問正解しました。
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="divide-y divide-gray-200">
							{questionSummaries.map((wa) => (
								<li
									key={wa.prompt}
									className="py-4 flex items-center space-x-4"
								>
									<div className="text-2xl shrink-0 flex items-center justify-center">
										{wa.yourAnswer === wa.correctAnswer ? (
											<CircleCheck className="w-12 h-12 text-green-500" />
										) : (
											<CircleX className="w-12 h-12 text-red-500" />
										)}
									</div>
									<div className="flex-1 space-y-1">
										<p className="font-medium">問題: {wa.prompt}</p>
										{wa.yourAnswer === wa.correctAnswer ? (
											<p>
												あなたの回答:{" "}
												<span className="text-green-500">{wa.yourAnswer}</span>
											</p>
										) : (
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<p>
													あなたの回答:{" "}
													<span className="text-red-500">{wa.yourAnswer}</span>
												</p>
												<p>
													正解:{" "}
													<span className="text-green-500">
														{wa.correctAnswer}
													</span>
												</p>
											</div>
										)}
										<p className="mt-1 text-sm text-muted-foreground">
											所要時間: {wa.timeSpent}秒
										</p>
									</div>
								</li>
							))}
						</ul>
					</CardContent>
					<CardFooter className="flex justify-end space-x-2">
						<Button variant="outline" onClick={goHome}>
							ホーム
						</Button>
						{hasWrong && onRetryWrong ? (
							<Button onClick={onRetryWrong}>間違った問題のみ再演習</Button>
						) : (
							<Button onClick={continueQuiz}>続ける</Button>
						)}
					</CardFooter>
				</Card>
			</Container>
		</>
	);
}
