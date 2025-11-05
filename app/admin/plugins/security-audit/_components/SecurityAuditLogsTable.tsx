"use client";

import { ArrowUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SecurityAuditLogEntry } from "@/app/_actions/plugin-security-audit-logs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface SecurityAuditLogsTableProps {
	logs: SecurityAuditLogEntry[];
	currentSortBy: string;
	currentSortOrder: "asc" | "desc";
}

const columns: {
	key: string;
	label: string;
	sortable: boolean;
}[] = [
	{ key: "created_at", label: "日時", sortable: true },
	{ key: "plugin_id", label: "プラグインID", sortable: true },
	{ key: "event_type", label: "イベントタイプ", sortable: true },
	{ key: "severity", label: "重要度", sortable: true },
	{ key: "user_id", label: "ユーザーID", sortable: false },
	{ key: "details", label: "詳細", sortable: false },
];

const severityColors: Record<string, string> = {
	low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
	medium:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
	high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
	critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const severityLabels: Record<string, string> = {
	low: "低",
	medium: "中",
	high: "高",
	critical: "緊急",
};

const eventTypeLabels: Record<string, string> = {
	api_call: "API呼び出し",
	api_call_failed: "API呼び出し失敗",
	rate_limit_violation: "レート制限違反",
	execution_timeout: "実行タイムアウト",
	storage_access: "ストレージアクセス",
	storage_quota_exceeded: "ストレージクォータ超過",
	plugin_error: "プラグインエラー",
	plugin_terminated: "プラグイン終了",
	unauthorized_access_attempt: "不正アクセス試行",
};

export function SecurityAuditLogsTable({
	logs,
	currentSortBy,
	currentSortOrder,
}: SecurityAuditLogsTableProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const handleSort = (columnKey: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (currentSortBy === columnKey) {
			params.set("sortOrder", currentSortOrder === "asc" ? "desc" : "asc");
		} else {
			params.set("sortBy", columnKey);
			params.set("sortOrder", "desc");
		}
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		const seconds = String(date.getSeconds()).padStart(2, "0");
		return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
	};

	const getEventDetails = (log: SecurityAuditLogEntry): string => {
		const { eventData } = log;
		if (log.eventType === "api_call" || log.eventType === "api_call_failed") {
			const namespace = String(eventData.namespace || "");
			const method = String(eventData.method || "");
			return `${namespace}.${method}`;
		}
		if (log.eventType === "rate_limit_violation") {
			return String(eventData.reason || "");
		}
		if (log.eventType === "execution_timeout") {
			const executionTime = Number(eventData.executionTime) || 0;
			const maxExecutionTime = Number(eventData.maxExecutionTime) || 0;
			return `${executionTime}ms / ${maxExecutionTime}ms`;
		}
		if (
			log.eventType === "storage_access" ||
			log.eventType === "storage_quota_exceeded"
		) {
			const operation = String(eventData.operation || "");
			const storageKey = eventData.storageKey
				? String(eventData.storageKey)
				: "";
			return storageKey ? `${operation} (${storageKey})` : operation;
		}
		if (log.eventType === "plugin_error") {
			return String(eventData.errorMessage || "");
		}
		if (log.eventType === "plugin_terminated") {
			const reason = String(eventData.reason || "");
			const executionTime = Number(eventData.executionTime) || 0;
			return `${reason} (${executionTime}ms)`;
		}
		return "";
	};

	if (!logs || logs.length === 0) {
		return (
			<p className="text-center text-muted-foreground py-8">
				ログが見つかりませんでした
			</p>
		);
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						{columns.map((column) => (
							<TableHead key={column.key}>
								{column.sortable ? (
									<Button
										variant="ghost"
										size="sm"
										className="-ml-3 h-8 data-[state=open]:bg-accent"
										onClick={() => handleSort(column.key)}
									>
										{column.label}
										<ArrowUpDown className="ml-2 h-4 w-4 shrink-0" />
									</Button>
								) : (
									column.label
								)}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{logs.map((log) => (
						<TableRow key={log.id}>
							<TableCell>{formatDate(log.createdAt)}</TableCell>
							<TableCell className="font-mono text-sm">
								{log.pluginId}
							</TableCell>
							<TableCell>
								{eventTypeLabels[log.eventType] || log.eventType}
							</TableCell>
							<TableCell>
								<Badge className={severityColors[log.severity] || ""}>
									{severityLabels[log.severity] || log.severity}
								</Badge>
							</TableCell>
							<TableCell className="font-mono text-sm">
								{log.userId || "-"}
							</TableCell>
							<TableCell className="text-sm text-muted-foreground max-w-md truncate">
								{getEventDetails(log)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
