"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * 学習目標の優先順位を一括更新します。
 *
 * Phase 2対応: RPC関数 `update_goals_priority` を使用してトランザクション管理を実装
 * すべての更新処理が単一のトランザクション内で実行され、データ整合性が保証されます。
 * エラーが発生した場合は自動的にロールバックされ、一部のみ更新されることはありません。
 */
export function useUpdateGoalsPriority() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (goalIds: string[]): Promise<void> => {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();

			if (authError || !user) {
				throw new Error(authError?.message ?? "Not authenticated");
			}

			// RPC関数を呼び出してトランザクション内で一括更新
			const { error } = await supabase.rpc("update_goals_priority", {
				p_user_id: user.id,
				p_goal_ids: goalIds,
			});

			if (error) {
				throw new Error(error.message || "優先順位の更新に失敗しました");
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["study_goals"] });
		},
	});
}
