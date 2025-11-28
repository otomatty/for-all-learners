import { cookies } from "next/headers";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import {
	getQuizQuestionsServer,
	type QuizParams,
} from "@/lib/services/quizService";
import { LearnPageClient } from "./_components/LearnPageClient";
import QuizSession from "./_components/QuizSession";

export default async function SessionPage() {
	// 静的エクスポート時はクライアントコンポーネントを使用
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return <LearnPageClient />;
	}

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
	const rawQuestions = await getQuizQuestionsServer(params);

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
