"use client";

import { useMutation } from "@tanstack/react-query";
import type { LLMProvider } from "@/lib/llm/client";

export interface GeneratedCard {
	front_content: string;
	back_content: string;
	source_audio_url: string;
}

export interface GenerateCardsPayload {
	transcript: string;
	sourceAudioUrl: string;
	provider?: LLMProvider;
	model?: string;
}

export interface GenerateCardsResponse {
	cards: GeneratedCard[];
}

/**
 * トランスクリプトからカードを生成するフック
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
export function useGenerateCards() {
	return useMutation<GenerateCardsResponse, Error, GenerateCardsPayload>({
		mutationFn: async (payload: GenerateCardsPayload) => {
			const response = await fetch("/api/ai/generate-cards", {
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

