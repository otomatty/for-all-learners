"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layouts/container";
import type {
	ClozeQuestion,
	FlashcardQuestion,
	MultipleChoiceQuestion,
} from "@/lib/gemini";
import type { QuizParams } from "@/lib/services/quizService";
import QuizSession from "./QuizSession";

type QuizQuestion =
	| (MultipleChoiceQuestion & { questionId: string; cardId: string })
	| (FlashcardQuestion & { questionId: string; cardId: string })
	| (ClozeQuestion & { questionId: string; cardId: string });

/**
 * Learn Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/learn/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/services/quizService.ts
 *   └─ app/(protected)/learn/_components/QuizSession.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function LearnPageClient() {
	const [params, setParams] = useState<QuizParams | null>(null);
	const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// クライアントサイドでクッキーから設定を取得
		const getCookie = (name: string): string | null => {
			const value = `; ${document.cookie}`;
			const parts = value.split(`; ${name}=`);
			if (parts.length === 2) {
				return parts.pop()?.split(";").shift() || null;
			}
			return null;
		};

		const raw = getCookie("quizSettings");
		if (!raw) {
			setError("設定が見つかりませんでした。");
			setIsLoading(false);
			return;
		}

		try {
			const parsedParams = JSON.parse(decodeURIComponent(raw)) as QuizParams;
			setParams(parsedParams);

			// クイズの問題を取得
			const fetchQuestions = async () => {
				try {
					// クライアントサイドではAPIエンドポイントを使用
					const response = await fetch("/api/quiz/questions", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(parsedParams),
					});

					if (!response.ok) {
						throw new Error("クイズの問題の取得に失敗しました");
					}

					const data = await response.json();
					setQuestions(data.questions || []);
				} catch (err) {
					setError(
						err instanceof Error
							? err.message
							: "クイズの問題の取得に失敗しました",
					);
				} finally {
					setIsLoading(false);
				}
			};

			fetchQuestions();
		} catch (_err) {
			setError("設定の解析に失敗しました。");
			setIsLoading(false);
		}
	}, []);

	if (isLoading) {
		return (
			<Container>
				<div className="flex items-center justify-center h-40">
					<p className="text-muted-foreground">読み込み中...</p>
				</div>
			</Container>
		);
	}

	if (error || !params) {
		return (
			<div className="text-center p-6 space-y-4">
				<p className="text-red-500">
					{error || "設定が見つかりませんでした。"}
				</p>
				<Link href="/dashboard" className="text-blue-500">
					ホームに戻る
				</Link>
			</div>
		);
	}

	if (!questions || questions.length === 0) {
		return (
			<div className="text-center p-6 space-y-4">
				<p className="text-red-500">クイズの問題が見つかりませんでした。</p>
				<Link href="/dashboard" className="text-blue-500">
					ホームに戻る
				</Link>
			</div>
		);
	}

	const defaultTimeLimit = params.mode === "mcq" ? 10 : 20;
	const timeLimit = defaultTimeLimit;

	return (
		<Container>
			<QuizSession
				mode={params.mode}
				questions={questions}
				timeLimit={timeLimit}
			/>
		</Container>
	);
}
