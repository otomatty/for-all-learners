"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PluginSignatureInfo } from "@/app/api/plugins/signatures/route";
import type { SignatureAlgorithm } from "@/lib/plugins/plugin-signature/types";

/**
 * Get plugin signatures
 */
export function useGetPluginSignatures(options?: {
	page?: number;
	limit?: number;
	sortBy?: "name" | "signed_at" | "signature_algorithm";
	sortOrder?: "asc" | "desc";
	hasSignature?: boolean;
	algorithm?: "ed25519" | "rsa";
	searchQuery?: string;
}) {
	const page = options?.page || 1;
	const limit = options?.limit || 50;
	const sortBy = options?.sortBy || "name";
	const sortOrder = options?.sortOrder || "asc";

	return useQuery({
		queryKey: [
			"plugins",
			"signatures",
			page,
			limit,
			sortBy,
			sortOrder,
			options?.hasSignature,
			options?.algorithm,
			options?.searchQuery,
		],
		queryFn: async (): Promise<{
			plugins: PluginSignatureInfo[];
			totalCount: number;
		}> => {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				sortBy,
				sortOrder,
			});

			if (options?.hasSignature !== undefined) {
				params.append("hasSignature", options.hasSignature.toString());
			}
			if (options?.algorithm) {
				params.append("algorithm", options.algorithm);
			}
			if (options?.searchQuery) {
				params.append("searchQuery", options.searchQuery);
			}

			const response = await fetch(`/api/plugins/signatures?${params}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "署名情報の取得に失敗しました");
			}

			const data = await response.json();
			return {
				plugins: data.plugins || [],
				totalCount: data.totalCount || 0,
			};
		},
	});
}

/**
 * Generate plugin signature
 */
export function useGeneratePluginSignature() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			pluginId,
			privateKey,
			algorithm,
			generateNewKeyPair,
		}: {
			pluginId: string;
			privateKey?: string;
			algorithm?: SignatureAlgorithm;
			generateNewKeyPair?: boolean;
		}): Promise<{
			signature: string;
			publicKey: string;
			algorithm: SignatureAlgorithm;
			signedAt: Date;
		}> => {
			const response = await fetch("/api/plugins/signatures", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					pluginId,
					privateKey,
					algorithm,
					generateNewKeyPair,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "署名の生成に失敗しました");
			}

			const data = await response.json();
			return {
				signature: data.signature,
				publicKey: data.publicKey,
				algorithm: data.algorithm,
				signedAt: new Date(data.signedAt),
			};
		},
		onSuccess: () => {
			// Invalidate signatures query
			queryClient.invalidateQueries({
				queryKey: ["plugins", "signatures"],
			});
		},
	});
}
