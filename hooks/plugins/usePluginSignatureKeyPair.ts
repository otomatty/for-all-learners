"use client";

import { useMutation } from "@tanstack/react-query";
import type { SignatureAlgorithm } from "@/lib/plugins/plugin-signature/types";

/**
 * Generate key pair for plugin signature
 */
export function useGenerateKeyPair() {
	return useMutation({
		mutationFn: async ({
			algorithm,
		}: {
			algorithm: SignatureAlgorithm;
		}): Promise<{
			publicKey: string;
			privateKey: string;
			algorithm: SignatureAlgorithm;
		}> => {
			const response = await fetch("/api/plugins/signatures/key-pair", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ algorithm }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "鍵ペアの生成に失敗しました");
			}

			const data = await response.json();
			return {
				publicKey: data.publicKey,
				privateKey: data.privateKey,
				algorithm: data.algorithm,
			};
		},
	});
}
