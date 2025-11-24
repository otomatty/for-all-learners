/**
 * Cards hooks utility functions
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ hooks/cards/useCreateCard.ts
 *   └─ hooks/cards/useUpdateCard.ts
 *
 * Dependencies (External files that this file imports):
 *   ├─ @supabase/supabase-js
 *   ├─ @/lib/gemini
 *   └─ @/lib/logger
 *
 * Related Documentation:
 *   └─ docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionType } from "@/lib/gemini";
import logger from "@/lib/logger";
import type { Card } from "./useCardsByDeck";

const DEFAULT_LOCALE = "ja";

/**
 * QuestionTypeの型ガード
 */
function isQuestionType(value: unknown): value is QuestionType {
	const validTypes: QuestionType[] = ["flashcard", "multiple_choice", "cloze"];
	return (
		typeof value === "string" && validTypes.includes(value as QuestionType)
	);
}

/**
 * カード作成・更新時に、有料ユーザーの場合にバックグラウンドで問題プリジェネレーションをキックします。
 *
 * @param supabase Supabaseクライアント
 * @param card 作成・更新されたカード
 */
export async function triggerQuestionGeneration(
	supabase: SupabaseClient,
	card: Card,
): Promise<void> {
	try {
		// Check if user has paid subscription
		const { data: subscription } = await supabase
			.from("subscriptions")
			.select("plan_id")
			.eq("user_id", card.user_id)
			.maybeSingle();

		const isPaid =
			subscription !== null &&
			subscription.plan_id !== "free" &&
			!subscription.plan_id.includes("_free");
		if (!isPaid) return;

		// Get user plan features
		if (!subscription) return;
		const { data: plan } = await supabase
			.from("plans")
			.select("features")
			.eq("id", subscription.plan_id)
			.single();

		if (!plan || !plan.features) return;

		// plan.features is Json type, cast to unknown first
		const features = plan.features as unknown;
		const featuresArray = Array.isArray(features) ? features : [];

		const { data: settings } = await supabase
			.from("user_settings")
			.select("locale")
			.eq("user_id", card.user_id)
			.single();
		const locale = settings?.locale ?? DEFAULT_LOCALE;

		const validFeatures = featuresArray.filter(isQuestionType);

		for (const type of validFeatures) {
			await supabase.functions.invoke("generate-questions-bg", {
				body: JSON.stringify({
					cardId: card.id,
					type,
					locale,
					userId: card.user_id,
				}),
			});
		}
	} catch (err) {
		// バックグラウンド処理の呼び出しエラーは、メインの処理に影響を与えないように握りつぶします。
		logger.error(
			{ error: err, cardId: card.id },
			"Failed to trigger question generation",
		);
	}
}
