"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PluginSecurityAlert } from "@/lib/plugins/plugin-security/types";

/**
 * Get security alerts
 */
export function useGetSecurityAlerts(options?: {
	page?: number;
	limit?: number;
	sortBy?: "created_at" | "severity" | "status";
	sortOrder?: "asc" | "desc";
	status?: "open" | "acknowledged" | "resolved" | "dismissed";
	severity?: "low" | "medium" | "high" | "critical";
	alertType?: string;
	pluginId?: string;
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
			"alerts",
			page,
			limit,
			sortBy,
			sortOrder,
			options?.status,
			options?.severity,
			options?.alertType,
			options?.pluginId,
			options?.searchQuery,
		],
		queryFn: async (): Promise<{
			alerts: PluginSecurityAlert[];
			totalCount: number;
		}> => {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				sortBy,
				sortOrder,
			});

			if (options?.status) {
				params.append("status", options.status);
			}
			if (options?.severity) {
				params.append("severity", options.severity);
			}
			if (options?.alertType) {
				params.append("alertType", options.alertType);
			}
			if (options?.pluginId) {
				params.append("pluginId", options.pluginId);
			}
			if (options?.searchQuery) {
				params.append("searchQuery", options.searchQuery);
			}

			const response = await fetch(`/api/plugins/security/alerts?${params}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.message || "セキュリティアラートの取得に失敗しました",
				);
			}

			const data = await response.json();
			return {
				alerts: data.alerts || [],
				totalCount: data.totalCount || 0,
			};
		},
	});
}

/**
 * Update alert status
 */
export function useUpdateAlertStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			alertId,
			status,
		}: {
			alertId: string;
			status: "open" | "acknowledged" | "resolved" | "dismissed";
		}): Promise<void> => {
			const response = await fetch(`/api/plugins/security/alerts/${alertId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.message || "アラートステータスの更新に失敗しました",
				);
			}
		},
		onSuccess: () => {
			// Invalidate alerts queries
			queryClient.invalidateQueries({
				queryKey: ["plugins", "security", "alerts"],
			});
			queryClient.invalidateQueries({
				queryKey: ["plugins", "security", "alerts", "statistics"],
			});
		},
	});
}

/**
 * Run anomaly detection
 */
export function useRunAnomalyDetection() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (): Promise<{ alertCount: number }> => {
			const response = await fetch(
				"/api/plugins/security/alerts/run-detection",
				{
					method: "POST",
				},
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "異常検知の実行に失敗しました");
			}

			const data = await response.json();
			return { alertCount: data.alertCount || 0 };
		},
		onSuccess: () => {
			// Invalidate alerts queries
			queryClient.invalidateQueries({
				queryKey: ["plugins", "security", "alerts"],
			});
			queryClient.invalidateQueries({
				queryKey: ["plugins", "security", "alerts", "statistics"],
			});
		},
	});
}

/**
 * Get alert statistics
 */
export function useGetAlertStatistics() {
	return useQuery({
		queryKey: ["plugins", "security", "alerts", "statistics"],
		queryFn: async (): Promise<{
			totalAlerts: number;
			openAlerts: number;
			acknowledgedAlerts: number;
			resolvedAlerts: number;
			criticalAlerts: number;
			highAlerts: number;
			mediumAlerts: number;
			lowAlerts: number;
		}> => {
			const response = await fetch("/api/plugins/security/alerts/statistics");

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "アラート統計の取得に失敗しました");
			}

			const data = await response.json();
			return (
				data.stats || {
					totalAlerts: 0,
					openAlerts: 0,
					acknowledgedAlerts: 0,
					resolvedAlerts: 0,
					criticalAlerts: 0,
					highAlerts: 0,
					mediumAlerts: 0,
					lowAlerts: 0,
				}
			);
		},
	});
}
