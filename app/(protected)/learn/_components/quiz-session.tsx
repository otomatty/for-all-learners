"use client";
import type { QuizMode } from "@/app/_actions/quiz";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type {
	ClozeQuestion,
	FlashcardQuestion,
	MultipleChoiceQuestion,
} from "@/lib/gemini";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import ClozeQuiz from "./cloze-quiz";
import FlashcardQuiz from "./flashcard-quiz";
import MultipleChoiceQuiz from "./multiple-choice-quiz";

interface QuizSessionProps {
	mode: QuizMode;
	questions: Array<
		| (MultipleChoiceQuestion & { questionId: string; cardId: string })
		| (FlashcardQuestion & { questionId: string; cardId: string })
		| (ClozeQuestion & { questionId: string; cardId: string })
	>;
	timeLimit: number;
}

const QuizSession: React.FC<QuizSessionProps> = ({
	mode,
	questions,
	timeLimit,
}) => {
	const [started, setStarted] = useState(false);
	const [startTime, setStartTime] = useState<string>("");

	const handleStart = () => {
		const now = Date.now().toString();
		setStartTime(now);
		setStarted(true);
	};

	if (!started) {
		return (
			<Container className="py-12">
				<Card className="max-w-md mx-auto">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl">準備はいいですか？</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-center text-sm text-muted-foreground">
							クイズを始める準備ができたら、下のボタンをクリックしてください。
						</p>
					</CardContent>
					<CardFooter className="flex justify-center space-x-4">
						<Button onClick={handleStart}>スタート</Button>
						<Button variant="outline" asChild>
							<Link href="/dashboard">ホームに戻る</Link>
						</Button>
					</CardFooter>
				</Card>
			</Container>
		);
	}

	switch (mode) {
		case "mcq":
			return (
				<MultipleChoiceQuiz
					questions={
						questions as (MultipleChoiceQuestion & {
							questionId: string;
							cardId: string;
						})[]
					}
					startTime={startTime}
					timeLimit={timeLimit}
				/>
			);
		case "one":
			return (
				<FlashcardQuiz
					questions={
						questions as (FlashcardQuestion & {
							questionId: string;
							cardId: string;
						})[]
					}
					startTime={startTime}
					timeLimit={timeLimit}
				/>
			);
		case "fill":
			return (
				<ClozeQuiz
					questions={
						questions as (ClozeQuestion & {
							questionId: string;
							cardId: string;
						})[]
					}
					startTime={startTime}
					timeLimit={20}
				/>
			);
		default:
			return (
				<div className="text-center p-6 space-y-4">
					<p className="text-red-500">無効なモードです。</p>
					<Link href="/dashboard" className="text-blue-500">
						ホームに戻る
					</Link>
				</div>
			);
	}
};

export default QuizSession;
