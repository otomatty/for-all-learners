import { cookies } from "next/headers";
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
import { Container } from "@/components/container";
export default async function SessionPage() {
	const cookieStore = await cookies();
	const raw = cookieStore.get("quizSettings")?.value;
	if (!raw) {
		return (
			<div className="text-center p-6 space-y-4">
				<p className="text-red-500">設定が見つかりませんでした。</p>
				<Link href="/dashboard" className="text-blue-500">
					ホームに戻る
				</Link>
			</div>
		);
	}
	const params = JSON.parse(raw) as QuizParams;
	const startTime = Date.now().toString();
	const defaultTimeLimit = params.mode === "mcq" ? 10 : 20;
	const timeLimit = defaultTimeLimit;

	// Fetch questions enriched with questionId and cardId
	const rawQuestions = await getQuizQuestions(params);

	return (
		<Container>
			{params.mode === "mcq" ? (
				<MultipleChoiceQuiz
					questions={
						rawQuestions as (MultipleChoiceQuestion & {
							questionId: string;
							cardId: string;
						})[]
					}
					startTime={startTime}
					timeLimit={timeLimit}
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
					timeLimit={timeLimit}
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
					timeLimit={timeLimit}
				/>
			) : (
				<div className="text-center p-6 space-y-4">
					<p className="text-red-500">無効なモードです。</p>
					<Link href="/dashboard" className="text-blue-500">
						ホームに戻る
					</Link>
				</div>
			)}
		</Container>
	);
}
