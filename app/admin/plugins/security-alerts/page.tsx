import { Suspense } from "react";
import {
	getPluginSecurityAlerts,
	getAlertStatistics,
	runAnomalyDetection,
} from "@/app/_actions/plugin-security-alerts";
import { SecurityAlertsFilters } from "./_components/SecurityAlertsFilters";
import { SecurityAlertsPagination } from "./_components/SecurityAlertsPagination";
import { SecurityAlertsStatsCards } from "./_components/SecurityAlertsStatsCards";
import { SecurityAlertsTable } from "./_components/SecurityAlertsTable";
import {
	type ParsedSecurityAlertsSearchParams,
	parseSecurityAlertsSearchParams,
	calculateAlertStatistics,
} from "./_utils";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface SecurityAlertsPageProps {
	searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function SecurityAlertsPage({
	searchParams,
}: SecurityAlertsPageProps) {
	const parsedParams = parseSecurityAlertsSearchParams(searchParams);

	const [alertsResult, statsResult] = await Promise.all([
		getPluginSecurityAlerts({
			page: parsedParams.page,
			limit: parsedParams.limit,
			sortBy: parsedParams.sortBy,
			sortOrder: parsedParams.sortOrder,
			filters: {
				status: parsedParams.status,
				severity: parsedParams.severity,
				alertType: parsedParams.alertType,
				pluginId: parsedParams.pluginId,
				searchQuery: parsedParams.searchQuery,
			},
		}),
		getAlertStatistics(),
	]);

	if (!alertsResult.success) {
		return (
			<div className="container mx-auto py-8 px-4 md:px-6">
				<p className="text-destructive text-center py-8">
					{alertsResult.message || "セキュリティアラートの取得に失敗しました"}
				</p>
			</div>
		);
	}

	const alerts = alertsResult.alerts || [];
	const totalCount = alertsResult.totalCount || 0;
	const totalPages = Math.ceil(totalCount / parsedParams.limit);

	// Calculate stats from alerts if stats API failed
	const stats = statsResult.stats || calculateAlertStatistics(alerts);

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
				<form action={runAnomalyDetection}>
					<Button type="submit" variant="outline" size="sm">
						<RefreshCw className="mr-2 h-4 w-4" />
						異常検知を実行
					</Button>
				</form>
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
					<SecurityAlertsStatsCards stats={stats} />
				</Suspense>

				<Suspense
					fallback={
						<div className="p-4 border rounded-lg bg-card text-card-foreground">
							フィルターを読み込み中...
						</div>
					}
				>
					<SecurityAlertsFilters initialFilters={initialFilters} />
				</Suspense>

				{alerts.length > 0 ? (
					<>
						<Suspense
							fallback={
								<div className="rounded-md border p-8 text-center">
									テーブルを読み込み中...
								</div>
							}
						>
							<SecurityAlertsTable
								alerts={alerts}
								currentSortBy={parsedParams.sortBy}
								currentSortOrder={parsedParams.sortOrder}
							/>
						</Suspense>
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

