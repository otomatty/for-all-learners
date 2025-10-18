import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route to record a learning log entry.
 */
export async function POST(request: NextRequest) {
	try {
		const { cardId, isCorrect, userAnswer, practiceMode } =
			(await request.json()) as {
				cardId: string;
				isCorrect: boolean;
				userAnswer: string;
				practiceMode: string;
			};

		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json(
				{ error: authError?.message || "Unauthorized" },
				{ status: 401 },
			);
		}
		const userId = user.id;
		const answeredAt = new Date().toISOString();
		const { data, error } = await supabase.from("learning_logs").insert([
			{
				user_id: userId,
				card_id: cardId,
				question_id: null,
				is_correct: isCorrect,
				user_answer: userAnswer,
				practice_mode: practiceMode,
				review_interval: null,
				next_review_at: null,
				answered_at: answeredAt,
			},
		]);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ log: data?.[0] }, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
