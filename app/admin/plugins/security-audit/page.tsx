import { Suspense } from "react";
import { getSecurityAuditLogs } from "@/app/_actions/plugin-security-audit-logs";
import { SecurityAuditLogsFilters } from "./_components/SecurityAuditLogsFilters";
import { SecurityAuditLogsPagination } from "./_components/SecurityAuditLogsPagination";
import { SecurityAuditLogsTable } from "./_components/SecurityAuditLogsTable";
import { SecurityAuditStatsCards } from "./_components/SecurityAuditStatsCards";
import {
	type GetSecurityAuditLogsOptions,
	getSecurityAuditStats,
	parseSecurityAuditLogsSearchParams,
} from "./_utils";

interface SecurityAuditLogsPageProps {
	searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function SecurityAuditLogsPage({
	searchParams,
}: SecurityAuditLogsPageProps) {
	const parsedParams = parseSecurityAuditLogsSearchParams(searchParams);

	const options: GetSecurityAuditLogsOptions = {
		page: parsedParams.page,
		limit: parsedParams.limit,
		sortBy: parsedParams.sortBy,
		sortOrder: parsedParams.sortOrder,
		filters: {
			pluginId: parsedParams.pluginId,
			userId: parsedParams.userId,
			eventType: parsedParams.eventType,
			severity: parsedParams.severity,
			searchQuery: parsedParams.searchQuery,
		},
	};

	const [result, stats] = await Promise.all([
		getSecurityAuditLogs(options),
		getSecurityAuditStats(),
	]);

	if (!result.success) {
		return (
			<div className="container mx-auto py-8 px-4 md:px-6">
				<p className="text-destructive text-center py-8">{result.message}</p>
			</div>
		);
	}

	const logs = result.logs || [];
	const totalCount = result.totalCount || 0;
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
				<Suspense
					fallback={
						<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
							{[...Array(4)].map((_, i) => (
								<div
									key={i}
									className="p-4 border rounded-lg bg-card animate-pulse"
								>
									<div className="h-4 bg-muted rounded w-1/2 mb-2" />
									<div className="h-8 bg-muted rounded w-1/4" />
								</div>
							))}
						</div>
					}
				>
					<SecurityAuditStatsCards stats={stats} />
				</Suspense>

				<Suspense
					fallback={
						<div className="p-4 border rounded-lg bg-card text-card-foreground">
							フィルターを読み込み中...
						</div>
					}
				>
					<SecurityAuditLogsFilters initialFilters={initialFilters} />
				</Suspense>

				{logs.length > 0 ? (
					<>
						<Suspense
							fallback={
								<div className="rounded-md border p-8 text-center">
									テーブルを読み込み中...
								</div>
							}
						>
							<SecurityAuditLogsTable
								logs={logs}
								currentSortBy={parsedParams.sortBy}
								currentSortOrder={parsedParams.sortOrder}
							/>
						</Suspense>
						{totalPages > 1 && (
							<Suspense
								fallback={
									<div className="text-center">
										ページネーションを読み込み中...
									</div>
								}
							>
								<SecurityAuditLogsPagination
									currentPage={parsedParams.page}
									totalPages={totalPages}
								/>
							</Suspense>
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
