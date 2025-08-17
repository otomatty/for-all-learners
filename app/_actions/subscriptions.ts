"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * ユーザーのアクティブまたはトライアル中のサブスクリプションを取得します
 * @param userId Supabase Auth のユーザーID
 */
export async function getUserSubscription(
	userId: string,
): Promise<Database["public"]["Tables"]["subscriptions"]["Row"] | null> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("subscriptions")
		.select("*")
		.eq("user_id", userId)
		.in("status", ["active", "trialing"])
		.order("current_period_end", { ascending: false })
		.maybeSingle();

	// データが見つからない場合はnullを返す（エラーではない）
	if (error) {
		console.error("getUserSubscription error:", error);
		return null;
	}
	return data;
}

/**
 * ユーザーが有料プラン（アクティブまたはトライアル中）かどうかを返します
 * @param userId Supabase Auth のユーザーID
 */
export async function isUserPaid(userId: string): Promise<boolean> {
	// ユーザーID検証
	if (!userId || userId.trim() === "") {
		console.error("isUserPaid: 無効なユーザーID", { userId });
		return false;
	}

	const subscription = await getUserSubscription(userId);
	// 無料プランのIDで判定（price_xxxxxxxxxxxxxx_free の場合は無料）
	const isPaid =
		subscription !== null && !subscription.plan_id.includes("_free");

	return isPaid;
}

/**
 * ユーザーのプラン機能（features JSONB）を取得します
 * @param userId Supabase Auth のユーザーID
 */
export async function getUserPlanFeatures(
	userId: string,
): Promise<Database["public"]["Tables"]["plans"]["Row"]["features"] | null> {
	const supabase = await createClient();
	const subscription = await getUserSubscription(userId);
	if (!subscription) {
		return null;
	}
	const { data: plan, error } = await supabase
		.from("plans")
		.select("features")
		.eq("id", subscription.plan_id)
		.maybeSingle();
	if (error) {
		console.error("getUserPlanFeatures error:", error);
		return null;
	}
	return plan?.features || null;
}

/**
 * Fetch the full plan row for the user's active or trialing subscription.
 * @param userId Supabase Auth ユーザーID
 */
export async function getUserPlan(
	userId: string,
): Promise<Database["public"]["Tables"]["plans"]["Row"] | null> {
	const supabase = await createClient();
	const subscription = await getUserSubscription(userId);
	if (!subscription) return null;
	const { data: plan, error } = await supabase
		.from("plans")
		.select("*")
		.eq("id", subscription.plan_id)
		.maybeSingle();
	if (error) {
		console.error("getUserPlan error:", error);
		return null;
	}
	return plan;
}
