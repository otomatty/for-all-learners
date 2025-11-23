"use client";

import { useMutation } from "@tanstack/react-query";

export interface CardToSavePayload {
	front_content: string;
	back_content: string;
}

export interface SaveCardsPayload {
	cards: CardToSavePayload[];
	pageId: string;
	deckId: string;
}

export interface SaveCardsResponse {
	savedCardsCount: number;
	error?: string;
}

/**
 * 生成済みカードを保存するフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ components/pages/generate-cards/generate-cards-form.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.2)
 */
export function useSaveCards() {
	return useMutation<SaveCardsResponse, Error, SaveCardsPayload>({
		mutationFn: async (payload: SaveCardsPayload) => {
			const response = await fetch("/api/cards/save", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `カードの保存に失敗しました: ${response.status}`,
				);
			}

			return response.json();
		},
	});
}

