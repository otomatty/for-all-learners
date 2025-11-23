"use client";

import { useMutation } from "@tanstack/react-query";

export interface GenerateTitlePayload {
	transcript: string;
}

export interface GenerateTitleResponse {
	title: string;
}

/**
 * トランスクリプトからタイトルを生成するフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/audio/_components/AudioCardGenerator.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.2)
 */
export function useGenerateTitle() {
	return useMutation<GenerateTitleResponse, Error, GenerateTitlePayload>({
		mutationFn: async (payload: GenerateTitlePayload) => {
			const response = await fetch("/api/ai/generate-title", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `タイトル生成に失敗しました: ${response.status}`,
				);
			}

			return response.json();
		},
	});
}
