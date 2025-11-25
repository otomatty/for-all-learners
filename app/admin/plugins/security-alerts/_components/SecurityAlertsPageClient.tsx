"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import logger from "@/lib/logger";
import type { PluginSecurityAlert } from "@/lib/plugins/plugin-security/types";
import {
	calculateAlertStatistics,
	type ParsedSecurityAlertsSearchParams,
	parseSecurityAlertsSearchParams,
} from "../_utils";
import { SecurityAlertsFilters } from "./SecurityAlertsFilters";
import { SecurityAlertsPagination } from "./SecurityAlertsPagination";
import { SecurityAlertsStatsCards } from "./SecurityAlertsStatsCards";
import { SecurityAlertsTable } from "./SecurityAlertsTable";

interface AlertStatistics {
	totalAlerts: number;
	openAlerts: number;
	acknowledgedAlerts: number;
	resolvedAlerts: number;
	criticalAlerts: number;
	highAlerts: number;
	mediumAlerts: number;
	lowAlerts: number;
}

interface SecurityAlertsResponse {
	alerts: PluginSecurityAlert[];
	totalCount: number;
	stats: AlertStatistics | null;
}

/**
 * Security Alerts Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/admin/plugins/security-alerts/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ next/navigation (useSearchParams)
 *   ├─ @tanstack/react-query (useQuery)
 *   └─ components/admin/plugins/security-alerts/* (Security components)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function SecurityAlertsPageClient() {
	const searchParams = useSearchParams();
	const [parsedParams, setParsedParams] =
		useState<ParsedSecurityAlertsSearchParams>({
			page: 1,
			limit: 50,
			sortBy: "created_at",
			sortOrder: "desc",
		});

	// URLパラメータから値を取得
	useEffect(() => {
		const params: { [key: string]: string | string[] | undefined } = {};
		searchParams.forEach((value, key) => {
			params[key] = value;
		});
		const parsed = parseSecurityAlertsSearchParams(params);
		setParsedParams(parsed);
	}, [searchParams]);

	// 検索APIを呼び出し
	const { data, isLoading, error, refetch } = useQuery<SecurityAlertsResponse>({
		queryKey: [
			"security-alerts",
			parsedParams.page,
			parsedParams.limit,
			parsedParams.sortBy,
			parsedParams.sortOrder,
			parsedParams.searchQuery,
			parsedParams.status,
			parsedParams.severity,
			parsedParams.alertType,
			parsedParams.pluginId,
		],
		queryFn: async () => {
			const params = new URLSearchParams({
				page: parsedParams.page.toString(),
				limit: parsedParams.limit.toString(),
				sortBy: parsedParams.sortBy,
				sortOrder: parsedParams.sortOrder,
			});

			if (parsedParams.searchQuery) {
				params.append("searchQuery", parsedParams.searchQuery);
			}
			if (parsedParams.status) {
				params.append("status", parsedParams.status);
			}
			if (parsedParams.severity) {
				params.append("severity", parsedParams.severity);
			}
			if (parsedParams.alertType) {
				params.append("alertType", parsedParams.alertType);
			}
			if (parsedParams.pluginId) {
				params.append("pluginId", parsedParams.pluginId);
			}

			const response = await fetch(
				`/api/admin/plugins/security-alerts?${params.toString()}`,
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error ?? "セキュリティアラートの取得に失敗しました",
				);
			}

			return response.json();
		},
	});

	// 異常検知を実行
	const handleRunAnomalyDetection = async () => {
		try {
			const response = await fetch(
				"/api/plugins/security/alerts/run-detection",
				{
					method: "POST",
				},
			);
			if (!response.ok) {
				throw new Error("異常検知の実行に失敗しました");
			}
			// データを再取得
			refetch();
		} catch (error) {
			logger.error({ error }, "Error running anomaly detection");
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto py-8 px-4 md:px-6">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
						プラグインセキュリティアラート
					</h1>
					<Button variant="outline" size="sm" disabled>
						<RefreshCw className="mr-2 h-4 w-4" />
						異常検知を実行
					</Button>
				</div>
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-muted-foreground">読み込み中...</div>
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="container mx-auto py-8 px-4 md:px-6">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
						プラグインセキュリティアラート
					</h1>
				</div>
				<p className="text-destructive text-center py-8">
					{error instanceof Error
						? error.message
						: "セキュリティアラートの取得に失敗しました"}
				</p>
			</div>
		);
	}

	const alerts = data.alerts || [];
	const totalCount = data.totalCount || 0;
	const totalPages = Math.ceil(totalCount / parsedParams.limit);

	// Calculate stats from alerts if stats API failed
	const stats = data.stats || calculateAlertStatistics(alerts);

	const initialFilters = {
		searchQuery: parsedParams.searchQuery,
		status: parsedParams.status,
		severity: parsedParams.severity,
		alertType: parsedParams.alertType,
		pluginId: parsedParams.pluginId,
	};

	return (
		<div className="container mx-auto py-8 px-4 md:px-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					プラグインセキュリティアラート
				</h1>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleRunAnomalyDetection}
				>
					<RefreshCw className="mr-2 h-4 w-4" />
					異常検知を実行
				</Button>
			</div>

			<div className="space-y-6">
				<SecurityAlertsStatsCards stats={stats} />

				<SecurityAlertsFilters initialFilters={initialFilters} />

				{alerts.length > 0 ? (
					<>
						<SecurityAlertsTable
							alerts={alerts}
							currentSortBy={parsedParams.sortBy}
							currentSortOrder={parsedParams.sortOrder}
						/>
						<div className="text-sm text-muted-foreground">
							全 {totalCount} 件中{" "}
							{alerts.length > 0
								? (parsedParams.page - 1) * parsedParams.limit + 1
								: 0}{" "}
							- {(parsedParams.page - 1) * parsedParams.limit + alerts.length}{" "}
							件表示
						</div>
						<SecurityAlertsPagination
							currentPage={parsedParams.page}
							totalPages={totalPages}
						/>
					</>
				) : (
					<p className="text-center text-muted-foreground py-8">
						{parsedParams.searchQuery ||
						parsedParams.status !== undefined ||
						parsedParams.severity !== undefined ||
						parsedParams.alertType ||
						parsedParams.pluginId
							? "指定された条件に一致するアラートはありません。"
							: "アラートはまだ生成されていません。"}
					</p>
				)}
			</div>
		</div>
	);
}
