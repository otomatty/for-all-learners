"use client";

import { useMutation } from "@tanstack/react-query";
import type { LLMProvider } from "@/lib/llm/client";

export interface GeneratePageInfoPayload {
	title: string;
	provider?: LLMProvider;
	model?: string;
}

export interface GeneratePageInfoResponse {
	markdown: string;
}

/**
 * ページタイトルからMarkdown形式の解説ドキュメントを生成するフック
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
export function useGeneratePageInfo() {
	return useMutation<GeneratePageInfoResponse, Error, GeneratePageInfoPayload>({
		mutationFn: async (payload: GeneratePageInfoPayload) => {
			const response = await fetch("/api/ai/generate-page-info", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error ||
						`ページ情報生成に失敗しました: ${response.status}`,
				);
			}

			return response.json();
		},
	});
}

