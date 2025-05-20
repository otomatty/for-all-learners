import {
	type QuestionData,
	type QuestionType,
	generateBulkQuestions,
} from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

export type QuizMode = "one" | "mcq" | "fill";

export interface QuizParams {
	deckId?: string;
	goalId?: string;
	mode: QuizMode;
	count: number;
	shuffle: boolean;
}

/**
 * 指定されたデッキまたは目標のカードを取得し、指定数だけ抽出して
 * Gemini で問題形式に変換したデータを返すサーバーアクション
 */
export async function getQuizQuestions(
	params: QuizParams,
): Promise<(QuestionData & { questionId: string; cardId: string })[]> {
	console.log(
		"[quiz.ts] getQuizQuestions called with params:",
		JSON.stringify(params),
	);
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

	// 目標に紐づくデッキIDのリスト
	let deckIds: string[] | undefined;
	if (params.deckId) {
		// 単一デッキの場合
		query = query.eq("deck_id", params.deckId);
	} else if (params.goalId) {
		// ゴールに紐づく複数デッキを取得
		const { data: links, error: linksError } = await supabase
			.from("goal_deck_links")
			.select("deck_id")
			.eq("goal_id", params.goalId);
		if (linksError) throw linksError;
		deckIds = links.map((l) => l.deck_id);
		if (!deckIds.length) {
			throw new Error("対象のデッキが見つかりません");
		}
		query = query.in("deck_id", deckIds);
	} else {
		throw new Error("deckId または goalId を指定してください");
	}

	// FSRSスケジューリング: 次回レビュー予定日が未来のカードを除外（null または 現在日時以下のみ取得）
	const now = new Date().toISOString();
	query = query.or(`next_review_at.is.null,next_review_at.lte.${now}`);

	// Attempt to fetch due cards based on scheduling
	const { data: initialCards, error: initialError } = await query;
	if (initialError) throw initialError;
	console.log("[quiz.ts] initialCards.length:", initialCards?.length ?? 0);
	// Use due cards if available, otherwise fallback to all cards (reducing question count accordingly)
	let cards = initialCards ?? [];
	if (cards.length === 0) {
		console.warn("No due cards found, falling back to all cards");
		let fallbackQuery = supabase
			.from("cards")
			.select("id, front_content, back_content");
		if (params.deckId) {
			fallbackQuery = fallbackQuery.eq("deck_id", params.deckId);
		} else if (params.goalId && deckIds) {
			// ゴールに紐づくデッキからフェールバック取得
			fallbackQuery = fallbackQuery.in("deck_id", deckIds);
		}
		const { data: allCards, error: fallbackError } = await fallbackQuery;
		if (fallbackError) throw fallbackError;
		cards = allCards ?? [];
		console.log("[quiz.ts] allCards.length (after fallback):", cards.length);
		if (cards.length === 0) {
			throw new Error("対象のカードが見つかりません");
		}
	}

	// Get authenticated user for saving questions
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) throw new Error("認証情報の取得に失敗しました");
	const userId = user.id;

	// Get user locale from settings (fallback to 'ja')
	const { data: settings, error: settingsError } = await supabase
		.from("user_settings")
		.select("locale")
		.eq("user_id", userId)
		.single();
	const locale = settings?.locale ?? "ja";

	// シャッフルと抽出
	const list = params.shuffle ? cards.sort(() => Math.random() - 0.5) : cards;
	const subset = list.slice(0, params.count);
	console.log("[quiz.ts] subset.length (cards to process):", subset.length);

	// モードマッピング
	const modeMap: Record<QuizMode, QuestionType> = {
		one: "flashcard",
		mcq: "multiple_choice",
		fill: "cloze",
	};
	const qType = modeMap[params.mode];

	// 抽出したカードIDリスト
	const subsetIds = subset.map((c) => c.id);

	// 既存の問題を取得してキャッシュ
	const { data: existingRows, error: fetchError } = await supabase
		.from("questions")
		.select("id, card_id, question_data")
		.in("card_id", subsetIds)
		.eq("type", qType);
	if (fetchError) throw fetchError;
	const existing = existingRows.map((row) => ({
		...(row.question_data as unknown as QuestionData),
		questionId: row.id,
		cardId: row.card_id,
	}));

	// 新規生成が必要なカードを抽出
	const existingIdSet = new Set(existingRows.map((row) => row.card_id));
	const newItems = subset.filter((c) => !existingIdSet.has(c.id));
	let newQuestions: (QuestionData & { questionId: string; cardId: string })[] =
		[];

	if (newItems.length > 0) {
		console.log(
			"[quiz.ts] newItems.length (cards for new question generation):",
			newItems.length,
		);
		// テキスト抽出ペアを準備
		const newPairs = newItems.map((card) => ({
			front: extractText(card.front_content),
			back: extractText(card.back_content),
		}));
		try {
			// LLMで問題生成
			const generated = await generateBulkQuestions(newPairs, qType, locale);
			// DBに挿入
			const modelUsed = process.env.GEMINI_MODEL || null;
			const records = generated.map((q, idx) => ({
				card_id: newItems[idx].id,
				user_id: userId,
				type: qType,
				question_data: q as unknown as Json,
				llm_model_used: modelUsed,
			}));
			const { data: inserted, error: insertError } = await supabase
				.from("questions")
				.insert(records)
				.select("id, card_id");
			if (insertError) throw insertError;
			// 新規問題を成形
			newQuestions = generated.map((q, idx) => ({
				...q,
				questionId: inserted[idx].id,
				cardId: inserted[idx].card_id,
			}));
		} catch (genError: unknown) {
			console.error("Error generating new questions:", genError);
			// フォールバック: Flashcard 形式で生成
			const fallbackRecords = newItems.map((item) => ({
				card_id: item.id,
				user_id: userId,
				type: "flashcard" as QuestionType,
				question_data: {
					type: "flashcard",
					prompt: extractText(item.front_content),
					answer: extractText(item.back_content),
				} as unknown as Json,
				llm_model_used: "fallback",
			}));
			const { data: fallbackInserted, error: fallbackError } = await supabase
				.from("questions")
				.insert(fallbackRecords)
				.select("id, card_id, question_data");
			if (fallbackError) throw fallbackError;
			newQuestions = fallbackInserted.map((row) => {
				const qData = row.question_data as unknown as QuestionData;
				return {
					...qData,
					questionId: row.id,
					cardId: row.card_id,
				};
			});
		}
	}

	// オリジナルの順序で結合して返却
	const allQuestions = subset
		.map(
			(card) =>
				existing.find((q) => q.cardId === card.id) ||
				newQuestions.find((q) => q.cardId === card.id) ||
				undefined,
		)
		.filter((q) => q !== undefined) as (QuestionData & {
		questionId: string;
		cardId: string;
	})[];
	return allQuestions;
}
