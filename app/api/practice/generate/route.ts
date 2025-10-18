import { type NextRequest, NextResponse } from "next/server";
import { generateQuestions, type QuestionType } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
	try {
		const { cardIds, type } = (await request.json()) as {
			cardIds: string[];
			type: QuestionType;
		};

		if (!cardIds || !type) {
			return NextResponse.json(
				{ error: "cardIds and type are required" },
				{ status: 400 },
			);
		}

		const supabase = await createClient();
		const { data: cards, error } = await supabase
			.from("cards")
			.select("id, front_content, back_content")
			.in("id", cardIds);

		if (error || !cards) {
			return NextResponse.json(
				{ error: error?.message ?? "Failed to fetch cards" },
				{ status: 500 },
			);
		}

		const questions = await Promise.all(
			cards.map(async (card) => {
				const qData = await generateQuestions(
					card.front_content as string,
					card.back_content as string,
					type,
				);
				return {
					cardId: card.id,
					question: qData,
				};
			}),
		);

		return NextResponse.json({ questions });
	} catch (err: unknown) {
		if (err instanceof Error) {
			return NextResponse.json({ error: err.message }, { status: 500 });
		}
		return NextResponse.json(
			{ error: "An unknown error occurred" },
			{ status: 500 },
		);
	}
}
