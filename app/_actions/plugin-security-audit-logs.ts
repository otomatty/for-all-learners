"use server";

import { isAdmin } from "@/app/_actions/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Security audit log entry
 */
export interface SecurityAuditLogEntry {
	id: string;
	pluginId: string;
	userId: string | null;
	eventType: string;
	severity: "low" | "medium" | "high" | "critical";
	eventData: Record<string, unknown>;
	context: Record<string, unknown>;
	createdAt: string;
}

/**
 * Options for getting security audit logs
 */
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

/**
 * Result of getting security audit logs
 */
export interface GetSecurityAuditLogsResult {
	logs: SecurityAuditLogEntry[];
	totalCount: number;
	message: string | null;
	success: boolean;
}

/**
 * Get security audit logs (admin only)
 *
 * @param options Query options
 * @returns Security audit logs result
 */
export async function getSecurityAuditLogs(
	options: GetSecurityAuditLogsOptions = {},
): Promise<GetSecurityAuditLogsResult> {
	// Check admin permission
	const admin = await isAdmin();
	if (!admin) {
		return {
			logs: [],
			totalCount: 0,
			message: "管理者権限が必要です",
			success: false,
		};
	}

	const supabase = await createClient();

	const {
		page = 1,
		limit = 50,
		sortBy = "created_at",
		sortOrder = "desc",
		filters = {},
	} = options;
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
		const searchQuery = `%${filters.searchQuery.trim()}%`;
		query = query.or(
			`plugin_id.ilike.${searchQuery},event_type.ilike.${searchQuery}`,
		);
	}

	// Apply sorting
	query = query.order(sortBy, { ascending: sortOrder === "asc" });

	// Apply pagination
	query = query.range(offset, offset + limit - 1);

	const { data, error, count } = await query;

	if (error) {
		return {
			logs: [],
			totalCount: 0,
			message: `セキュリティ監査ログの取得中にエラーが発生しました。(詳細: ${error.message})`,
			success: false,
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
		logs,
		totalCount: count || 0,
		message: "セキュリティ監査ログを正常に取得しました。",
		success: true,
	};
}
