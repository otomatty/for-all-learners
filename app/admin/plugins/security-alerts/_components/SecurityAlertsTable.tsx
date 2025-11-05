"use client";

import {
	AlertTriangle,
	ArrowUpDown,
	CheckCircle2,
	Clock,
	XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { PluginSecurityAlert } from "@/app/_actions/plugin-security-alerts";
import { updateAlertStatus } from "@/app/_actions/plugin-security-alerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface SecurityAlertsTableProps {
	alerts: PluginSecurityAlert[];
	currentSortBy: string;
	currentSortOrder: "asc" | "desc";
}

export function SecurityAlertsTable({
	alerts,
	currentSortBy,
	currentSortOrder,
}: SecurityAlertsTableProps) {
	const router = useRouter();
	const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);

	const handleStatusChange = async (
		alertId: string,
		newStatus: "open" | "acknowledged" | "resolved" | "dismissed",
	) => {
		setUpdatingAlertId(alertId);
		try {
			const result = await updateAlertStatus(alertId, newStatus);
			if (result.success) {
				toast.success("アラートステータスを更新しました");
				router.refresh();
			} else {
				toast.error(result.message || "ステータスの更新に失敗しました");
			}
		} catch (error) {
			toast.error("エラーが発生しました");
		} finally {
			setUpdatingAlertId(null);
		}
	};

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case "critical":
				return "bg-red-100 text-red-800 border-red-200";
			case "high":
				return "bg-orange-100 text-orange-800 border-orange-200";
			case "medium":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "low":
				return "bg-blue-100 text-blue-800 border-blue-200";
			default:
				return "";
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "open":
				return "bg-red-50 text-red-700 border-red-200";
			case "acknowledged":
				return "bg-yellow-50 text-yellow-700 border-yellow-200";
			case "resolved":
				return "bg-green-50 text-green-700 border-green-200";
			case "dismissed":
				return "bg-gray-50 text-gray-700 border-gray-200";
			default:
				return "";
		}
	};

	const formatDate = (date: Date | null) => {
		if (!date) return "-";
		return date.toLocaleString("ja-JP", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getAlertTypeLabel = (alertType: string) => {
		const labels: Record<string, string> = {
			rate_limit_spike: "レート制限急増",
			signature_failure_spike: "署名検証失敗急増",
			execution_timeout_spike: "実行タイムアウト急増",
			storage_quota_spike: "ストレージクォータ急増",
			unauthorized_access_spike: "不正アクセス試行急増",
			api_call_anomaly: "API呼び出し異常",
			plugin_error_spike: "プラグインエラー急増",
			critical_severity_event: "緊急重要度イベント",
		};
		return labels[alertType] || alertType;
	};

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<Button
								variant="ghost"
								onClick={() => {
									const params = new URLSearchParams(window.location.search);
									if (currentSortBy === "created_at") {
										params.set(
											"sortOrder",
											currentSortOrder === "asc" ? "desc" : "asc",
										);
									} else {
										params.set("sortBy", "created_at");
										params.set("sortOrder", "desc");
									}
									router.push(`?${params.toString()}`, { scroll: false });
								}}
								className="h-8 px-2 lg:px-3"
							>
								作成日時
								{currentSortBy === "created_at" && (
									<ArrowUpDown className="ml-2 h-4 w-4" />
								)}
							</Button>
						</TableHead>
						<TableHead>タイトル</TableHead>
						<TableHead>プラグインID</TableHead>
						<TableHead>
							<Button
								variant="ghost"
								onClick={() => {
									const params = new URLSearchParams(window.location.search);
									if (currentSortBy === "severity") {
										params.set(
											"sortOrder",
											currentSortOrder === "asc" ? "desc" : "asc",
										);
									} else {
										params.set("sortBy", "severity");
										params.set("sortOrder", "desc");
									}
									router.push(`?${params.toString()}`, { scroll: false });
								}}
								className="h-8 px-2 lg:px-3"
							>
								重要度
								{currentSortBy === "severity" && (
									<ArrowUpDown className="ml-2 h-4 w-4" />
								)}
							</Button>
						</TableHead>
						<TableHead>アラートタイプ</TableHead>
						<TableHead>
							<Button
								variant="ghost"
								onClick={() => {
									const params = new URLSearchParams(window.location.search);
									if (currentSortBy === "status") {
										params.set(
											"sortOrder",
											currentSortOrder === "asc" ? "desc" : "asc",
										);
									} else {
										params.set("sortBy", "status");
										params.set("sortOrder", "asc");
									}
									router.push(`?${params.toString()}`, { scroll: false });
								}}
								className="h-8 px-2 lg:px-3"
							>
								ステータス
								{currentSortBy === "status" && (
									<ArrowUpDown className="ml-2 h-4 w-4" />
								)}
							</Button>
						</TableHead>
						<TableHead>操作</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{alerts.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={8}
								className="text-center text-muted-foreground"
							>
								アラートが見つかりませんでした
							</TableCell>
						</TableRow>
					) : (
						alerts.map((alert) => (
							<TableRow key={alert.id}>
								<TableCell className="text-sm text-muted-foreground">
									{formatDate(alert.createdAt)}
								</TableCell>
								<TableCell className="font-medium max-w-md">
									<div className="truncate">{alert.title}</div>
									<div className="text-xs text-muted-foreground truncate">
										{alert.description}
									</div>
								</TableCell>
								<TableCell className="font-mono text-sm">
									{alert.pluginId || "-"}
								</TableCell>
								<TableCell>
									<Badge
										variant="outline"
										className={getSeverityColor(alert.severity)}
									>
										{alert.severity === "critical" && (
											<AlertTriangle className="mr-1 h-3 w-3" />
										)}
										{alert.severity === "high" && (
											<AlertTriangle className="mr-1 h-3 w-3" />
										)}
										{alert.severity.toUpperCase()}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge variant="outline" className="text-xs">
										{getAlertTypeLabel(alert.alertType)}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge
										variant="outline"
										className={getStatusColor(alert.status)}
									>
										{alert.status === "open" && (
											<AlertTriangle className="mr-1 h-3 w-3" />
										)}
										{alert.status === "acknowledged" && (
											<Clock className="mr-1 h-3 w-3" />
										)}
										{alert.status === "resolved" && (
											<CheckCircle2 className="mr-1 h-3 w-3" />
										)}
										{alert.status === "dismissed" && (
											<XCircle className="mr-1 h-3 w-3" />
										)}
										{alert.status === "open" && "未対応"}
										{alert.status === "acknowledged" && "対応中"}
										{alert.status === "resolved" && "解決済み"}
										{alert.status === "dismissed" && "却下"}
									</Badge>
								</TableCell>
								<TableCell>
									<Select
										value={alert.status}
										onValueChange={(value) => {
											handleStatusChange(
												alert.id,
												value as
													| "open"
													| "acknowledged"
													| "resolved"
													| "dismissed",
											);
										}}
										disabled={updatingAlertId === alert.id}
									>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="open">未対応</SelectItem>
											<SelectItem value="acknowledged">対応中</SelectItem>
											<SelectItem value="resolved">解決済み</SelectItem>
											<SelectItem value="dismissed">却下</SelectItem>
										</SelectContent>
									</Select>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
