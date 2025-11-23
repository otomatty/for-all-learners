"use client";

import { useQuery } from "@tanstack/react-query";
import type { SignatureVerificationLog } from "@/app/api/plugins/signatures/route";

/**
 * Get signature verification logs
 */
export function useGetSignatureVerificationLogs(options?: {
	page?: number;
	limit?: number;
	sortBy?: "verified_at" | "verification_result";
	sortOrder?: "asc" | "desc";
	pluginId?: string;
	userId?: string;
	verificationResult?: "valid" | "invalid" | "missing" | "error";
}) {
	const page = options?.page || 1;
	const limit = options?.limit || 50;
	const sortBy = options?.sortBy || "verified_at";
	const sortOrder = options?.sortOrder || "desc";

	return useQuery({
		queryKey: [
			"plugins",
			"signatures",
			"verification-logs",
			page,
			limit,
			sortBy,
			sortOrder,
			options?.pluginId,
			options?.userId,
			options?.verificationResult,
		],
		queryFn: async (): Promise<{
			logs: SignatureVerificationLog[];
			totalCount: number;
		}> => {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				sortBy,
				sortOrder,
			});

			if (options?.pluginId) {
				params.append("pluginId", options.pluginId);
			}
			if (options?.userId) {
				params.append("userId", options.userId);
			}
			if (options?.verificationResult) {
				params.append("verificationResult", options.verificationResult);
			}

			const response = await fetch(
				`/api/plugins/signatures/verification-logs?${params}`,
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "検証ログの取得に失敗しました");
			}

			const data = await response.json();
			return {
				logs: data.logs || [],
				totalCount: data.totalCount || 0,
			};
		},
	});
}
