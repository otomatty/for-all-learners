import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecurityAuditStats } from "../_utils";

interface SecurityAuditStatsCardsProps {
	stats: SecurityAuditStats;
}

export function SecurityAuditStatsCards({
	stats,
}: SecurityAuditStatsCardsProps) {
	return (
		<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">総イベント数</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.totalEvents}</div>
					<p className="text-xs text-muted-foreground">過去24時間</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">緊急/高重要度</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-red-600">
						{stats.recentCriticalEvents}
					</div>
					<p className="text-xs text-muted-foreground">過去24時間</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">緊急イベント</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-red-600">
						{stats.eventsBySeverity.critical}
					</div>
					<p className="text-xs text-muted-foreground">全期間</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">
						高重要度イベント
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-orange-600">
						{stats.eventsBySeverity.high}
					</div>
					<p className="text-xs text-muted-foreground">全期間</p>
				</CardContent>
			</Card>
		</div>
	);
}
