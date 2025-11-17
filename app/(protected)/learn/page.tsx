import { cookies } from "next/headers";
import Link from "next/link";
import { getQuizQuestions, type QuizParams } from "@/app/_actions/quiz";
import { Container } from "@/components/layouts/container";
import QuizSession from "./_components/QuizSession";

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
	const defaultTimeLimit = params.mode === "mcq" ? 10 : 20;
	const timeLimit = defaultTimeLimit;

	// Fetch questions enriched with questionId and cardId
	const rawQuestions = await getQuizQuestions(params);

	return (
		<Container>
			<QuizSession
				mode={params.mode}
				questions={rawQuestions}
				timeLimit={timeLimit}
			/>
		</Container>
	);
}
