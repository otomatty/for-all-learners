"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { isUserPaid } from "./subscriptions";
export async function getStudyGoalsByUser(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("study_goals")
		.select("*")
		.eq("user_id", userId)
		.order("priority_order", { ascending: true })
		.order("created_at", { ascending: false });
	if (error) {
		throw error;
	}
	return data;
}

// 成功 or エラー情報を返す型
export type AddStudyGoalResult =
	| { success: true; data: Database["public"]["Tables"]["study_goals"]["Row"] }
	| { success: false; error: string };

export async function addStudyGoal({
	title,
	description,
	deadline,
}: {
	title: string;
	description?: string;
	deadline?: string;
}): Promise<AddStudyGoalResult> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return { success: false, error: authError?.message ?? "Not authenticated" };
	}

	// 現在の目標数を取得して制限をチェック
	const currentGoals = await getStudyGoalsByUser(user.id);

	// サブスクリプション状態を確認
	const isPaid = await isUserPaid(user.id);

	// 制限チェック
	const maxGoals = isPaid ? 10 : 3;
	if (currentGoals.length >= maxGoals) {
		const planType = isPaid ? "有料プラン" : "無料プラン";
		return {
			success: false,
			error: `${planType}では最大${maxGoals}個の目標まで設定できます。`,
		};
	}

	// deadline が空文字の場合は null にする
	const sanitizedDeadline = deadline?.trim() === "" ? null : deadline;

	// 次の優先順位を取得
	const { count } = await supabase
		.from("study_goals")
		.select("*", { count: "exact", head: true })
		.eq("user_id", user.id);
	const nextPriority = (count ?? 0) + 1;

	const { data, error } = await supabase
		.from("study_goals")
		.insert({
			user_id: user.id,
			title,
			description,
			deadline: sanitizedDeadline,
			progress_rate: 0,
			status: "in_progress",
			priority_order: nextPriority,
		})
		.select()
		.single();
	if (error || !data) {
		return {
			success: false,
			error: error?.message || "Failed to add study goal",
		};
	}
	return { success: true, data };
}

/**
 * ユーザーの目標制限情報を取得
 */
export async function getUserGoalLimits(userId: string) {
	// ユーザーID検証
	if (!userId || userId.trim() === "") {
		return {
			currentCount: 0,
			maxGoals: 3,
			canAddMore: true,
			isPaid: false,
			remainingGoals: 3,
		};
	}

	try {
		const [currentGoals, isPaid] = await Promise.all([
			getStudyGoalsByUser(userId),
			isUserPaid(userId),
		]);

		const maxGoals = isPaid ? 10 : 3;
		const currentCount = currentGoals.length;
		const canAddMore = currentCount < maxGoals;

		const result = {
			currentCount,
			maxGoals,
			canAddMore,
			isPaid,
			remainingGoals: maxGoals - currentCount,
		};
		return result;
	} catch (_error) {
		// エラーが発生した場合は無料プランとして扱う
		const currentGoals = await getStudyGoalsByUser(userId);
		const fallbackResult = {
			currentCount: currentGoals.length,
			maxGoals: 3,
			canAddMore: currentGoals.length < 3,
			isPaid: false,
			remainingGoals: 3 - currentGoals.length,
		};

		return fallbackResult;
	}
}

// 目標更新用の型
export type UpdateStudyGoalResult =
	| { success: true; data: Database["public"]["Tables"]["study_goals"]["Row"] }
	| { success: false; error: string };

// 目標更新データの型定義
interface StudyGoalUpdateData {
	title?: string;
	description?: string;
	deadline?: string | null;
	status?: "not_started" | "in_progress" | "completed";
	progress_rate?: number;
	updated_at?: string;
	completed_at?: string;
}

export async function updateStudyGoal({
	goalId,
	title,
	description,
	deadline,
	status,
	progressRate,
}: {
	goalId: string;
	title?: string;
	description?: string;
	deadline?: string;
	status?: "not_started" | "in_progress" | "completed";
	progressRate?: number;
}): Promise<UpdateStudyGoalResult> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return { success: false, error: authError?.message ?? "Not authenticated" };
	}

	// 更新データを構築
	const updateData: StudyGoalUpdateData = {};
	if (title !== undefined) updateData.title = title;
	if (description !== undefined) updateData.description = description;
	if (deadline !== undefined)
		updateData.deadline = deadline?.trim() === "" ? null : deadline;
	if (status !== undefined) updateData.status = status;
	if (progressRate !== undefined) {
		updateData.progress_rate = Math.max(0, Math.min(100, progressRate));
		if (updateData.progress_rate === 100 && status === undefined) {
			updateData.status = "completed";
			updateData.completed_at = new Date().toISOString();
		}
	}
	updateData.updated_at = new Date().toISOString();

	const { data, error } = await supabase
		.from("study_goals")
		.update(updateData)
		.eq("id", goalId)
		.eq("user_id", user.id)
		.select()
		.single();

	if (error || !data) {
		return {
			success: false,
			error: error?.message || "Failed to update study goal",
		};
	}

	return { success: true, data };
}

// 目標削除用の型
export type DeleteStudyGoalResult =
	| { success: true }
	| { success: false; error: string };

export async function deleteStudyGoal(
	goalId: string,
): Promise<DeleteStudyGoalResult> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return { success: false, error: authError?.message ?? "Not authenticated" };
	}

	// 関連するgoal_deck_linksも削除
	await supabase.from("goal_deck_links").delete().eq("goal_id", goalId);

	const { error } = await supabase
		.from("study_goals")
		.delete()
		.eq("id", goalId)
		.eq("user_id", user.id);

	if (error) {
		return {
			success: false,
			error: error.message || "Failed to delete study goal",
		};
	}

	return { success: true };
}

// 目標完了設定用の関数
export async function completeStudyGoal(
	goalId: string,
): Promise<UpdateStudyGoalResult> {
	return updateStudyGoal({
		goalId,
		status: "completed",
		progressRate: 100,
	});
}

// 優先順位一括更新用の型
export type UpdateGoalsPriorityResult =
	| { success: true }
	| { success: false; error: string };

// 優先順位一括更新
export async function updateGoalsPriority(
	goalIds: string[],
): Promise<UpdateGoalsPriorityResult> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return { success: false, error: authError?.message ?? "Not authenticated" };
	}

	try {
		// トランザクション的に一括更新
		for (let i = 0; i < goalIds.length; i++) {
			const { error } = await supabase
				.from("study_goals")
				.update({ priority_order: i + 1 })
				.eq("id", goalIds[i])
				.eq("user_id", user.id); // セキュリティ確保

			if (error) throw error;
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
