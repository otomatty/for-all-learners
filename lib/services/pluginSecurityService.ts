/**
 * Plugin Security Service
 *
 * Server-side functions for plugin security audit logs and alerts
 * These functions can be used in server components and API routes
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this service):
 *   ├─ app/admin/plugins/security-audit/page.tsx
 *   ├─ app/admin/plugins/security-alerts/page.tsx
 *   └─ app/admin/plugins/security-audit/_utils.ts
 *
 * Dependencies (External files that this service uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/supabase/adminClient.ts (createAdminClient)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import type {
	PluginSecurityAlert,
	SecurityAuditLogEntry,
} from "@/lib/plugins/plugin-security/types";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";

export interface GetSecurityAuditLogsOptions {
	page?: number;
	limit?: number;
	sortBy?: "created_at" | "severity" | "event_type" | "plugin_id";
	sortOrder?: "asc" | "desc";
	filters?: {
		pluginId?: string;
		userId?: string;
		eventType?: string;
		severity?: "low" | "medium" | "high" | "critical";
		searchQuery?: string;
	};
}

export interface GetSecurityAuditLogsResult {
	success: boolean;
	message?: string;
	logs?: SecurityAuditLogEntry[];
	totalCount?: number;
}

export interface GetPluginSecurityAlertsOptions {
	page?: number;
	limit?: number;
	sortBy?: "created_at" | "severity" | "status";
	sortOrder?: "asc" | "desc";
	filters?: {
		status?: "open" | "acknowledged" | "resolved" | "dismissed";
		severity?: "low" | "medium" | "high" | "critical";
		alertType?: string;
		pluginId?: string;
		searchQuery?: string;
	};
}

export interface GetPluginSecurityAlertsResult {
	success: boolean;
	message?: string;
	alerts?: PluginSecurityAlert[];
	totalCount?: number;
}

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

export interface AlertStatistics {
	totalAlerts: number;
	openAlerts: number;
	acknowledgedAlerts: number;
	resolvedAlerts: number;
	criticalAlerts: number;
	highAlerts: number;
	mediumAlerts: number;
	lowAlerts: number;
}

/**
 * Check if user is admin
 */
async function checkAdminAccess(): Promise<{
	isAdmin: boolean;
	userId?: string;
}> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { isAdmin: false };
	}

	const { data: adminData } = await supabase
		.from("admin_users")
		.select("role, is_active")
		.eq("user_id", user.id)
		.maybeSingle();

	const admin = Boolean(
		adminData?.is_active &&
			(adminData.role === "superadmin" || adminData.role === "admin"),
	);

	return {
		isAdmin: admin,
		userId: user.id,
	};
}

/**
 * Get security audit logs (server-side)
 */
export async function getSecurityAuditLogsServer(
	options: GetSecurityAuditLogsOptions = {},
): Promise<GetSecurityAuditLogsResult> {
	try {
		// Check admin access
		const adminCheck = await checkAdminAccess();
		if (!adminCheck.isAdmin) {
			return {
				success: false,
				message: "管理者権限が必要です",
			};
		}

		const supabase = await createClient();
		const page = options.page || 1;
		const limit = options.limit || 50;
		const sortBy = options.sortBy || "created_at";
		const sortOrder = options.sortOrder || "desc";
		const filters = options.filters || {};

		const offset = (page - 1) * limit;

		let query = supabase
			.from("plugin_security_audit_logs")
			.select("*", { count: "exact" });

		// Apply filters
		if (filters.pluginId) {
			query = query.eq("plugin_id", filters.pluginId);
		}
		if (filters.userId) {
			query = query.eq("user_id", filters.userId);
		}
		if (filters.eventType) {
			query = query.eq("event_type", filters.eventType);
		}
		if (filters.severity) {
			query = query.eq("severity", filters.severity);
		}
		if (filters.searchQuery && filters.searchQuery.trim() !== "") {
			const search = `%${filters.searchQuery.trim()}%`;
			query = query.or(`plugin_id.ilike.${search},event_type.ilike.${search}`);
		}

		// Apply sorting
		query = query.order(sortBy, { ascending: sortOrder === "asc" });

		// Apply pagination
		query = query.range(offset, offset + limit - 1);

		const { data, error, count } = await query;

		if (error) {
			return {
				success: false,
				message: `セキュリティ監査ログの取得中にエラーが発生しました。(詳細: ${error.message})`,
			};
		}

		const logs: SecurityAuditLogEntry[] =
			data?.map(
				(log: {
					id: string;
					plugin_id: string;
					user_id: string | null;
					event_type: string;
					severity: string;
					event_data: unknown;
					context: unknown;
					created_at: string | null;
				}) => ({
					id: log.id,
					pluginId: log.plugin_id,
					userId: log.user_id,
					eventType: log.event_type,
					severity: log.severity as "low" | "medium" | "high" | "critical",
					eventData: (log.event_data as Record<string, unknown>) || {},
					context: (log.context as Record<string, unknown>) || {},
					createdAt: log.created_at || "",
				}),
			) || [];

		return {
			success: true,
			logs,
			totalCount: count || 0,
		};
	} catch (error: unknown) {
		return {
			success: false,
			message: `セキュリティ監査ログの取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

/**
 * Get security audit statistics (server-side)
 */
export async function getSecurityAuditStatsServer(): Promise<SecurityAuditStats> {
	// Get all logs from last 24 hours for statistics
	const result = await getSecurityAuditLogsServer({
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

/**
 * Get plugin security alerts (server-side)
 */
export async function getPluginSecurityAlertsServer(
	options: GetPluginSecurityAlertsOptions = {},
): Promise<GetPluginSecurityAlertsResult> {
	try {
		// Check admin access
		const adminCheck = await checkAdminAccess();
		if (!adminCheck.isAdmin) {
			return {
				success: false,
				message: "管理者権限が必要です",
			};
		}

		const adminClient = createAdminClient();
		const page = options.page || 1;
		const limit = options.limit || 50;
		const sortBy = options.sortBy || "created_at";
		const sortOrder = options.sortOrder || "desc";
		const filters = options.filters || {};

		let query = adminClient
			.from("plugin_security_alerts")
			.select("*", { count: "exact" });

		// Apply filters
		if (filters.status) {
			query = query.eq("status", filters.status);
		}

		if (filters.severity) {
			query = query.eq("severity", filters.severity);
		}

		if (filters.alertType) {
			query = query.eq("alert_type", filters.alertType);
		}

		if (filters.pluginId) {
			query = query.eq("plugin_id", filters.pluginId);
		}

		if (filters.searchQuery) {
			const search = filters.searchQuery;
			query = query.or(
				`title.ilike.%${search}%,description.ilike.%${search}%,plugin_id.ilike.%${search}%`,
			);
		}

		// Apply sorting
		switch (sortBy) {
			case "severity":
				query = query.order("severity", {
					ascending: sortOrder === "asc",
				});
				break;
			case "status":
				query = query.order("status", {
					ascending: sortOrder === "asc",
				});
				break;
			default:
				query = query.order("created_at", {
					ascending: sortOrder === "asc",
				});
				break;
		}

		// Apply pagination
		const from = (page - 1) * limit;
		const to = from + limit - 1;
		query = query.range(from, to);

		const { data, error, count } = await query;

		if (error) {
			return {
				success: false,
				message: `セキュリティアラートの取得に失敗しました: ${error.message}`,
			};
		}

		const alerts: PluginSecurityAlert[] = (data || []).map((row) => ({
			id: row.id,
			alertType: row.alert_type,
			severity: row.severity as "low" | "medium" | "high" | "critical",
			title: row.title,
			description: row.description,
			pluginId: row.plugin_id,
			userId: row.user_id,
			alertData: (row.alert_data as Record<string, unknown>) || {},
			context: (row.context as Record<string, unknown>) || {},
			status: row.status as "open" | "acknowledged" | "resolved" | "dismissed",
			acknowledgedBy: row.acknowledged_by,
			acknowledgedAt: row.acknowledged_at
				? new Date(row.acknowledged_at)
				: null,
			resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
			createdAt: new Date(row.created_at || new Date()),
			updatedAt: new Date(row.updated_at || new Date()),
		}));

		return {
			success: true,
			alerts,
			totalCount: count || 0,
		};
	} catch (error: unknown) {
		return {
			success: false,
			message: `セキュリティアラートの取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

/**
 * Get alert statistics (server-side)
 */
export async function getAlertStatisticsServer(): Promise<{
	success: boolean;
	message?: string;
	stats?: AlertStatistics;
}> {
	try {
		// Check admin access
		const adminCheck = await checkAdminAccess();
		if (!adminCheck.isAdmin) {
			return {
				success: false,
				message: "管理者権限が必要です",
			};
		}

		const adminClient = createAdminClient();

		// Get all alerts for statistics
		const { data, error } = await adminClient
			.from("plugin_security_alerts")
			.select("status, severity");

		if (error) {
			return {
				success: false,
				message: `アラート統計の取得に失敗しました: ${error.message}`,
			};
		}

		const alerts = data || [];
		const stats: AlertStatistics = {
			totalAlerts: alerts.length,
			openAlerts: alerts.filter((a) => a.status === "open").length,
			acknowledgedAlerts: alerts.filter((a) => a.status === "acknowledged")
				.length,
			resolvedAlerts: alerts.filter((a) => a.status === "resolved").length,
			criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
			highAlerts: alerts.filter((a) => a.severity === "high").length,
			mediumAlerts: alerts.filter((a) => a.severity === "medium").length,
			lowAlerts: alerts.filter((a) => a.severity === "low").length,
		};

		return {
			success: true,
			stats,
		};
	} catch (error: unknown) {
		return {
			success: false,
			message: `アラート統計の取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}
