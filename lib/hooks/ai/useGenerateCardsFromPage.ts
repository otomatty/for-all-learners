"use client";

import { useMutation } from "@tanstack/react-query";
import type { LLMProvider } from "@/lib/llm/client";
import type { Json } from "@/types/database.types";

export interface GeneratedRawCard {
	front_content: string;
	back_content: string;
}

export interface GenerateCardsFromPagePayload {
	pageContentTiptap: Json | null;
	pageId: string;
	deckId: string;
	saveToDatabase?: boolean;
	provider?: LLMProvider;
	model?: string;
}

export interface GenerateCardsFromPageResponse {
	cards: GeneratedRawCard[];
	savedCardsCount?: number;
	error?: string;
}

/**
 * ページコンテンツからカードを生成するフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ components/pages/generate-cards/generate-cards-form.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   ├─ @/lib/llm/client
 *   └─ @/types/database.types
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.2)
 */
export function useGenerateCardsFromPage() {
	return useMutation<
		GenerateCardsFromPageResponse,
		Error,
		GenerateCardsFromPagePayload
	>({
		mutationFn: async (payload: GenerateCardsFromPagePayload) => {
			const response = await fetch("/api/ai/generate-cards-from-page", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `カード生成に失敗しました: ${response.status}`,
				);
			}

			return response.json();
		},
	});
}
