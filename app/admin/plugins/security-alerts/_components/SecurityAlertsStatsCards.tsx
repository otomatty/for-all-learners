import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

interface SecurityAlertsStatsCardsProps {
	stats: {
		totalAlerts: number;
		openAlerts: number;
		acknowledgedAlerts: number;
		resolvedAlerts: number;
		criticalAlerts: number;
		highAlerts: number;
		mediumAlerts: number;
		lowAlerts: number;
	};
}

export function SecurityAlertsStatsCards({
	stats,
}: SecurityAlertsStatsCardsProps) {
	return (
		<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">未対応アラート</CardTitle>
					<AlertTriangle className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-red-600">
						{stats.openAlerts}
					</div>
					<p className="text-xs text-muted-foreground">
						全 {stats.totalAlerts} 件中
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">緊急・高重要度</CardTitle>
					<AlertTriangle className="h-4 w-4 text-red-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-red-600">
						{stats.criticalAlerts + stats.highAlerts}
					</div>
					<p className="text-xs text-muted-foreground">
						緊急: {stats.criticalAlerts} / 高: {stats.highAlerts}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">対応中</CardTitle>
					<Clock className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-yellow-600">
						{stats.acknowledgedAlerts}
					</div>
					<p className="text-xs text-muted-foreground">確認済み</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">解決済み</CardTitle>
					<CheckCircle2 className="h-4 w-4 text-green-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-green-600">
						{stats.resolvedAlerts}
					</div>
					<p className="text-xs text-muted-foreground">完了</p>
				</CardContent>
			</Card>
		</div>
	);
}

