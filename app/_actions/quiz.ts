import { createClient } from "@/lib/supabase/server";
import {
	generateBulkQuestions,
	type QuestionType,
	type QuestionData,
} from "@/lib/gemini";
import type { Json } from "@/types/database.types";

export type QuizMode = "one" | "mcq" | "fill";

export interface QuizParams {
	deckId?: string;
	goalId?: string;
	mode: QuizMode;
	count: number;
	difficulty: "easy" | "normal" | "hard";
	shuffle: boolean;
}

/**
 * 指定されたデッキまたは目標のカードを取得し、指定数だけ抽出して
 * Gemini で問題形式に変換したデータを返すサーバーアクション
 */
export async function getQuizQuestions(
	params: QuizParams,
): Promise<(QuestionData & { questionId: string; cardId: string })[]> {
	const supabase = await createClient();

	// Helper to extract plain text from Tiptap JSON content
	function extractText(node: unknown): string {
		if (typeof node === "string") return node;
		if (Array.isArray(node)) return node.map(extractText).join("");
		if (node && typeof node === "object") {
			const text =
				typeof (node as { text: string }).text === "string"
					? (node as { text: string }).text
					: "";
			const children = Array.isArray((node as { content: unknown[] }).content)
				? (node as { content: unknown[] }).content.map(extractText).join("")
				: "";
			return text + children;
		}
		return "";
	}

	// カード取得クエリを構築
	let query = supabase.from("cards").select("id, front_content, back_content");

	if (params.deckId) {
		query = query.eq("deck_id", params.deckId);
	} else if (params.goalId) {
		query = query.eq("goal_id", params.goalId);
	} else {
		throw new Error("deckId または goalId を指定してください");
	}

	const { data: cards, error } = await query;
	if (error) throw error;
	if (!cards || cards.length === 0)
		throw new Error("対象のカードが見つかりません");

	// Get authenticated user for saving questions
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) throw new Error("認証情報の取得に失敗しました");
	const userId = user.id;

	// シャッフルと抽出
	const list = params.shuffle ? cards.sort(() => Math.random() - 0.5) : cards;
	const subset = list.slice(0, params.count);

	// モードマッピング
	const modeMap: Record<QuizMode, QuestionType> = {
		one: "flashcard",
		mcq: "multiple_choice",
		fill: "cloze",
	};
	const qType = modeMap[params.mode];

	// Bulk generate questions in one request
	const pairs = subset.map((card) => ({
		front: extractText(card.front_content),
		back: extractText(card.back_content),
	}));
	try {
		const bulkQuestions = await generateBulkQuestions(
			pairs,
			qType,
			params.difficulty,
		);
		// Save generated questions in 'questions' table
		const records = bulkQuestions.map((q, idx) => ({
			card_id: subset[idx].id,
			user_id: userId,
			type: qType,
			question_data: q as unknown as Json,
		}));
		const { data: insertedQuestions, error: insertError } = await supabase
			.from("questions")
			.insert(records)
			.select("id, card_id");
		if (insertError) throw insertError;
		// Enrich question data with cardId and questionId for client-side logging
		return bulkQuestions.map((q, idx) => ({
			...q,
			questionId: insertedQuestions[idx].id,
			cardId: insertedQuestions[idx].card_id,
		}));
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`問題の一括生成と保存に失敗しました: ${msg}`);
	}
}
