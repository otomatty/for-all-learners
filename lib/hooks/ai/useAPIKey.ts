"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LLMProvider } from "@/lib/llm/client";

export interface APIKeyStatus {
	configured: boolean;
	updatedAt: string | null;
}

export interface GetAPIKeyStatusResponse {
	data: Record<LLMProvider, APIKeyStatus>;
}

export interface SaveAPIKeyPayload {
	provider: LLMProvider;
	apiKey: string;
	test?: boolean;
}

export interface SaveAPIKeyResponse {
	message: string;
}

export interface DeleteAPIKeyPayload {
	provider: LLMProvider;
}

export interface DeleteAPIKeyResponse {
	message: string;
}

/**
 * APIキーの状態を取得するフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ (将来の使用箇所)
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   └─ @/lib/llm/client
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.2)
 */
export function useAPIKeyStatus() {
	return useQuery<GetAPIKeyStatusResponse, Error>({
		queryKey: ["api-key-status"],
		queryFn: async () => {
			const response = await fetch("/api/ai/api-key", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error ||
						`APIキー状態の取得に失敗しました: ${response.status}`,
				);
			}

			return response.json();
		},
	});
}

/**
 * APIキーを保存するフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ (将来の使用箇所)
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   └─ @/lib/llm/client
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.2)
 */
export function useSaveAPIKey() {
	const queryClient = useQueryClient();

	return useMutation<SaveAPIKeyResponse, Error, SaveAPIKeyPayload>({
		mutationFn: async (payload: SaveAPIKeyPayload) => {
			const response = await fetch("/api/ai/api-key", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `APIキーの保存に失敗しました: ${response.status}`,
				);
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["api-key-status"] });
		},
	});
}

/**
 * APIキーを削除するフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ (将来の使用箇所)
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   └─ @/lib/llm/client
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.2)
 */
export function useDeleteAPIKey() {
	const queryClient = useQueryClient();

	return useMutation<DeleteAPIKeyResponse, Error, DeleteAPIKeyPayload>({
		mutationFn: async (payload: DeleteAPIKeyPayload) => {
			const response = await fetch("/api/ai/api-key", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `APIキーの削除に失敗しました: ${response.status}`,
				);
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["api-key-status"] });
		},
	});
}

