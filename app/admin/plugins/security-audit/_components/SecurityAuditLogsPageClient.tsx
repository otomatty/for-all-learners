"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { SecurityAuditLogEntry } from "@/lib/plugins/plugin-security/types";
import type { SecurityAuditStats } from "@/lib/services/pluginSecurityService";
import {
	type ParsedSecurityAuditLogsSearchParams,
	parseSecurityAuditLogsSearchParams,
} from "../_utils";
import { SecurityAuditLogsFilters } from "./SecurityAuditLogsFilters";
import { SecurityAuditLogsPagination } from "./SecurityAuditLogsPagination";
import { SecurityAuditLogsTable } from "./SecurityAuditLogsTable";
import { SecurityAuditStatsCards } from "./SecurityAuditStatsCards";

interface SecurityAuditLogsResponse {
	logs: SecurityAuditLogEntry[];
	totalCount: number;
	stats: SecurityAuditStats;
}

/**
 * Security Audit Logs Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/admin/plugins/security-audit/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ next/navigation (useSearchParams)
 *   ├─ @tanstack/react-query (useQuery)
 *   └─ components/admin/plugins/security-audit/* (Security components)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function SecurityAuditLogsPageClient() {
	const searchParams = useSearchParams();
	const [parsedParams, setParsedParams] =
		useState<ParsedSecurityAuditLogsSearchParams>({
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
		const parsed = parseSecurityAuditLogsSearchParams(params);
		setParsedParams(parsed);
	}, [searchParams]);

	// 検索APIを呼び出し
	const { data, isLoading, error } = useQuery<SecurityAuditLogsResponse>({
		queryKey: [
			"security-audit-logs",
			parsedParams.page,
			parsedParams.limit,
			parsedParams.sortBy,
			parsedParams.sortOrder,
			parsedParams.searchQuery,
			parsedParams.pluginId,
			parsedParams.userId,
			parsedParams.eventType,
			parsedParams.severity,
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
			if (parsedParams.pluginId) {
				params.append("pluginId", parsedParams.pluginId);
			}
			if (parsedParams.userId) {
				params.append("userId", parsedParams.userId);
			}
			if (parsedParams.eventType) {
				params.append("eventType", parsedParams.eventType);
			}
			if (parsedParams.severity) {
				params.append("severity", parsedParams.severity);
			}

			const response = await fetch(
				`/api/admin/plugins/security-audit?${params.toString()}`,
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error ?? "セキュリティ監査ログの取得に失敗しました",
				);
			}

			return response.json();
		},
	});

	if (isLoading) {
		return (
			<div className="container mx-auto py-8 px-4 md:px-6">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
						プラグインセキュリティ監査ログ
					</h1>
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
						プラグインセキュリティ監査ログ
					</h1>
				</div>
				<p className="text-destructive text-center py-8">
					{error instanceof Error
						? error.message
						: "セキュリティ監査ログの取得に失敗しました"}
				</p>
			</div>
		);
	}

	const logs = data.logs || [];
	const totalCount = data.totalCount || 0;
	const totalPages = Math.ceil(totalCount / parsedParams.limit);

	const initialFilters = {
		searchQuery: parsedParams.searchQuery,
		pluginId: parsedParams.pluginId,
		userId: parsedParams.userId,
		eventType: parsedParams.eventType,
		severity: parsedParams.severity,
	};

	return (
		<div className="container mx-auto py-8 px-4 md:px-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					プラグインセキュリティ監査ログ
				</h1>
			</div>

			<div className="space-y-6">
				<SecurityAuditStatsCards stats={data.stats} />

				<SecurityAuditLogsFilters initialFilters={initialFilters} />

				{logs.length > 0 ? (
					<>
						<SecurityAuditLogsTable
							logs={logs}
							currentSortBy={parsedParams.sortBy}
							currentSortOrder={parsedParams.sortOrder}
						/>
						{totalPages > 1 && (
							<SecurityAuditLogsPagination
								currentPage={parsedParams.page}
								totalPages={totalPages}
							/>
						)}
						<div className="text-sm text-muted-foreground">
							全 {totalCount} 件中{" "}
							{logs.length > 0
								? (parsedParams.page - 1) * parsedParams.limit + 1
								: 0}{" "}
							- {(parsedParams.page - 1) * parsedParams.limit + logs.length}{" "}
							件表示
						</div>
					</>
				) : (
					<p className="text-center text-muted-foreground py-8">
						{parsedParams.searchQuery ||
						parsedParams.pluginId ||
						parsedParams.userId ||
						parsedParams.eventType ||
						parsedParams.severity
							? "指定された条件に一致するログはありません。"
							: "セキュリティ監査ログはまだありません。"}
					</p>
				)}
			</div>
		</div>
	);
}
