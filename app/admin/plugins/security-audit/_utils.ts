/**
 * Parse search params for security audit logs page
 */

import {
	type GetSecurityAuditLogsOptions,
	getSecurityAuditLogs,
} from "@/app/_actions/plugin-security-audit-logs";

export interface ParsedSecurityAuditLogsSearchParams {
	page: number;
	limit: number;
	sortBy: "created_at" | "severity" | "event_type" | "plugin_id";
	sortOrder: "asc" | "desc";
	searchQuery?: string;
	pluginId?: string;
	userId?: string;
	eventType?: string;
	severity?: "low" | "medium" | "high" | "critical";
}

export function parseSecurityAuditLogsSearchParams(searchParams?: {
	[key: string]: string | string[] | undefined;
}): ParsedSecurityAuditLogsSearchParams {
	const page = searchParams?.page ? Number(searchParams.page) : 1;
	const limit = searchParams?.limit ? Number(searchParams.limit) : 50;
	const sortBy =
		(searchParams?.sortBy as
			| "created_at"
			| "severity"
			| "event_type"
			| "plugin_id") || "created_at";
	const sortOrder = (searchParams?.sortOrder as "asc" | "desc") || "desc";
	const searchQuery =
		typeof searchParams?.searchQuery === "string"
			? searchParams.searchQuery
			: undefined;
	const pluginId =
		typeof searchParams?.pluginId === "string"
			? searchParams.pluginId
			: undefined;
	const userId =
		typeof searchParams?.userId === "string" ? searchParams.userId : undefined;
	const eventType =
		typeof searchParams?.eventType === "string"
			? searchParams.eventType
			: undefined;
	const severity =
		typeof searchParams?.severity === "string" &&
		["low", "medium", "high", "critical"].includes(searchParams.severity)
			? (searchParams.severity as "low" | "medium" | "high" | "critical")
			: undefined;

	return {
		page: Math.max(1, page),
		limit: Math.max(1, Math.min(100, limit)),
		sortBy,
		sortOrder,
		searchQuery,
		pluginId,
		userId,
		eventType,
		severity,
	};
}

/**
 * Security audit statistics
 */
export interface SecurityAuditStats {
	totalEvents: number;
	eventsBySeverity: {
		low: number;
		medium: number;
		high: number;
		critical: number;
	};
	eventsByType: Record<string, number>;
	recentCriticalEvents: number;
}

/**
 * Get security audit statistics
 */
export async function getSecurityAuditStats(): Promise<SecurityAuditStats> {
	// Get all logs from last 24 hours for statistics
	const result = await getSecurityAuditLogs({
		limit: 1000,
		sortBy: "created_at",
		sortOrder: "desc",
	});

	const logs = result.logs || [];
	const stats: SecurityAuditStats = {
		totalEvents: logs.length,
		eventsBySeverity: {
			low: 0,
			medium: 0,
			high: 0,
			critical: 0,
		},
		eventsByType: {},
		recentCriticalEvents: 0,
	};

	const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

	for (const log of logs) {
		// Count by severity
		if (log.severity in stats.eventsBySeverity) {
			stats.eventsBySeverity[
				log.severity as keyof typeof stats.eventsBySeverity
			]++;
		}

		// Count by type
		stats.eventsByType[log.eventType] =
			(stats.eventsByType[log.eventType] || 0) + 1;

		// Count recent critical events (last 24 hours)
		const logTime = new Date(log.createdAt).getTime();
		if (
			logTime >= oneDayAgo &&
			(log.severity === "critical" || log.severity === "high")
		) {
			stats.recentCriticalEvents++;
		}
	}

	return stats;
}

export type { GetSecurityAuditLogsOptions };
