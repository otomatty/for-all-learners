"use client";

import { useQuery } from "@tanstack/react-query";
import type { SecurityAuditLogEntry } from "@/app/api/plugins/security/audit-logs/route";

/**
 * Get security audit logs
 */
export function useGetSecurityAuditLogs(options?: {
	page?: number;
	limit?: number;
	sortBy?: "created_at" | "severity" | "event_type" | "plugin_id";
	sortOrder?: "asc" | "desc";
	pluginId?: string;
	userId?: string;
	eventType?: string;
	severity?: "low" | "medium" | "high" | "critical";
	searchQuery?: string;
}) {
	const page = options?.page || 1;
	const limit = options?.limit || 50;
	const sortBy = options?.sortBy || "created_at";
	const sortOrder = options?.sortOrder || "desc";

	return useQuery({
		queryKey: [
			"plugins",
			"security",
			"audit-logs",
			page,
			limit,
			sortBy,
			sortOrder,
			options?.pluginId,
			options?.userId,
			options?.eventType,
			options?.severity,
			options?.searchQuery,
		],
		queryFn: async (): Promise<{
			logs: SecurityAuditLogEntry[];
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
			if (options?.eventType) {
				params.append("eventType", options.eventType);
			}
			if (options?.severity) {
				params.append("severity", options.severity);
			}
			if (options?.searchQuery) {
				params.append("searchQuery", options.searchQuery);
			}

			const response = await fetch(
				`/api/plugins/security/audit-logs?${params}`,
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.message || "セキュリティ監査ログの取得に失敗しました",
				);
			}

			const data = await response.json();
			return {
				logs: data.logs || [],
				totalCount: data.totalCount || 0,
			};
		},
	});
}
