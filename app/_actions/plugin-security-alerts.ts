/**
 * Server Actions for Plugin Security Alerts
 *
 * DEPENDENCY MAP:
 *
 * Parents:
 *   ├─ app/admin/plugins/security-alerts/page.tsx
 *   └─ lib/plugins/plugin-security-anomaly-detector.ts
 *
 * Dependencies:
 *   ├─ lib/supabase/server
 *   ├─ lib/supabase/admin
 *   └─ lib/plugins/plugin-security-anomaly-detector.ts
 *
 * Related Documentation:
 *   └─ Issue #96: Plugin System Security Enhancement
 */

"use server";

import { isAdmin } from "@/app/_actions/admin";
import logger from "@/lib/logger";
import { getAnomalyDetector } from "@/lib/plugins/plugin-security-anomaly-detector";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type AlertRow = Database["public"]["Tables"]["plugin_security_alerts"]["Row"];

export interface PluginSecurityAlert {
	id: string;
	alertType: string;
	severity: "low" | "medium" | "high" | "critical";
	title: string;
	description: string;
	pluginId: string | null;
	userId: string | null;
	alertData: Record<string, unknown>;
	context: Record<string, unknown>;
	status: "open" | "acknowledged" | "resolved" | "dismissed";
	acknowledgedBy: string | null;
	acknowledgedAt: Date | null;
	resolvedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
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

/**
 * Get plugin security alerts
 */
export async function getPluginSecurityAlerts(
	options: GetPluginSecurityAlertsOptions = {},
): Promise<GetPluginSecurityAlertsResult> {
	try {
		const adminClient = createAdminClient();
		const _supabase = await createClient();

		// Check admin access
		if (!(await isAdmin())) {
			return {
				success: false,
				message: "Unauthorized: Admin access required",
			};
		}

		const page = options.page || 1;
		const limit = options.limit || 50;
		const sortBy = options.sortBy || "created_at";
		const sortOrder = options.sortOrder || "desc";

		let query = adminClient
			.from("plugin_security_alerts")
			.select("*", { count: "exact" });

		// Apply filters
		if (options.filters?.status) {
			query = query.eq("status", options.filters.status);
		}

		if (options.filters?.severity) {
			query = query.eq("severity", options.filters.severity);
		}

		if (options.filters?.alertType) {
			query = query.eq("alert_type", options.filters.alertType);
		}

		if (options.filters?.pluginId) {
			query = query.eq("plugin_id", options.filters.pluginId);
		}

		if (options.filters?.searchQuery) {
			const search = options.filters.searchQuery;
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
				message: `Failed to fetch alerts: ${error.message}`,
			};
		}

		const alerts: PluginSecurityAlert[] = (data || []).map((row: AlertRow) => ({
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
	} catch (error) {
		logger.error({ error }, "Failed to get plugin security alerts");
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Update alert status
 */
export async function updateAlertStatus(
	alertId: string,
	status: "open" | "acknowledged" | "resolved" | "dismissed",
): Promise<{ success: boolean; message?: string }> {
	try {
		const adminClient = createAdminClient();
		const _supabase = await createClient();

		// Check admin access
		if (!(await isAdmin())) {
			return {
				success: false,
				message: "Unauthorized: Admin access required",
			};
		}

		// Get current user
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return {
				success: false,
				message: "User not authenticated",
			};
		}

		const updateData: {
			status: string;
			acknowledged_by?: string | null;
			acknowledged_at?: string | null;
			resolved_at?: string | null;
			updated_at: string;
		} = {
			status,
			updated_at: new Date().toISOString(),
		};

		if (status === "acknowledged") {
			updateData.acknowledged_by = user.id;
			updateData.acknowledged_at = new Date().toISOString();
		}

		if (status === "resolved") {
			updateData.resolved_at = new Date().toISOString();
		}

		const { error } = await adminClient
			.from("plugin_security_alerts")
			.update(updateData)
			.eq("id", alertId);

		if (error) {
			logger.error({ error, alertId }, "Failed to update alert status");
			return {
				success: false,
				message: `Failed to update alert: ${error.message}`,
			};
		}

		logger.info({ alertId, status }, "Alert status updated");
		return {
			success: true,
		};
	} catch (error) {
		logger.error({ error, alertId }, "Failed to update alert status");
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Run anomaly detection manually
 */
export async function runAnomalyDetection(): Promise<{
	success: boolean;
	message?: string;
	alertCount?: number;
}> {
	try {
		// Check admin access
		if (!(await isAdmin())) {
			return {
				success: false,
				message: "Unauthorized: Admin access required",
			};
		}

		const detector = getAnomalyDetector();
		const alertCount = await detector.runDetection();

		return {
			success: true,
			alertCount,
		};
	} catch (error) {
		logger.error({ error }, "Failed to run anomaly detection");
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get alert statistics
 */
export async function getAlertStatistics(): Promise<{
	success: boolean;
	message?: string;
	stats?: {
		totalAlerts: number;
		openAlerts: number;
		acknowledgedAlerts: number;
		resolvedAlerts: number;
		criticalAlerts: number;
		highAlerts: number;
		mediumAlerts: number;
		lowAlerts: number;
	};
}> {
	try {
		const adminClient = createAdminClient();

		// Check admin access
		if (!(await isAdmin())) {
			return {
				success: false,
				message: "Unauthorized: Admin access required",
			};
		}

		// Get all alerts for statistics
		const { data, error } = await adminClient
			.from("plugin_security_alerts")
			.select("status, severity");

		if (error) {
			return {
				success: false,
				message: `Failed to fetch alert statistics: ${error.message}`,
			};
		}

		const alerts = data || [];
		const stats = {
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
	} catch (error) {
		logger.error({ error }, "Failed to get alert statistics");
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
