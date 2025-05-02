import { getQuizQuestions, type QuizParams } from "@/app/_actions/quiz";
import FlashcardQuiz from "./_components/FlashcardQuiz";
import MultipleChoiceQuiz from "./_components/MultipleChoiceQuiz";
import ClozeQuiz from "./_components/ClozeQuiz";
import type {
	MultipleChoiceQuestion,
	FlashcardQuestion,
	ClozeQuestion,
} from "@/lib/gemini";
import Link from "next/link";

interface SessionPageProps {
	// searchParams must be awaited in Next.js dynamic pages
	searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function SessionPage({
	searchParams: searchParamsPromise,
}: SessionPageProps) {
	// Await dynamic searchParams promise
	const searchParams = await searchParamsPromise;
	// Quiz session start time (ms since epoch)
	const startTime = searchParams.startTime ?? Date.now().toString();
	// Build parameters from query
	const params: QuizParams = {
		deckId: searchParams.deckId,
		goalId: searchParams.goalId,
		mode: (searchParams.mode as QuizParams["mode"]) ?? "one",
		count: Number.parseInt(searchParams.count ?? "10", 10),
		difficulty:
			(searchParams.difficulty as QuizParams["difficulty"]) ?? "normal",
		shuffle: searchParams.shuffle === "true",
	};

	// Fetch questions enriched with questionId and cardId
	const rawQuestions = await getQuizQuestions(params);

	return (
		<div className="p-4 space-y-6">
			{params.mode === "mcq" ? (
				<MultipleChoiceQuiz
					questions={
						rawQuestions as (MultipleChoiceQuestion & {
							questionId: string;
							cardId: string;
						})[]
					}
					startTime={startTime}
				/>
			) : params.mode === "one" ? (
				<FlashcardQuiz
					questions={
						rawQuestions as (FlashcardQuestion & {
							questionId: string;
							cardId: string;
						})[]
					}
					startTime={startTime}
				/>
			) : params.mode === "fill" ? (
				<ClozeQuiz
					questions={
						rawQuestions as (ClozeQuestion & {
							questionId: string;
							cardId: string;
						})[]
					}
					startTime={startTime}
				/>
			) : (
				<div className="text-center p-6 space-y-4">
					<p className="text-red-500">無効なモードです。</p>
					<Link href="/learn" className="text-blue-500">
						学習モード選択に戻る
					</Link>
				</div>
			)}
		</div>
	);
}
