import { type NextRequest, NextResponse } from "next/server";
import {
	getQuizQuestionsServer,
	type QuizParams,
} from "@/lib/services/quizService";

/**
 * Quiz Questions API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ app/(protected)/learn/_components/LearnPageClient.tsx
 *
 * Dependencies (External files that this route uses):
 *   └─ lib/services/quizService.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export async function POST(request: NextRequest) {
	try {
		const params = (await request.json()) as QuizParams;

		if (!params.deckId && !params.goalId) {
			return NextResponse.json(
				{ error: "deckId or goalId is required" },
				{ status: 400 },
			);
		}

		const questions = await getQuizQuestionsServer(params);

		return NextResponse.json({ questions });
	} catch (error) {
		return NextResponse.json(
			{
				error: "Failed to get quiz questions",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
