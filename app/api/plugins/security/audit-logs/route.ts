/**
 * Plugin Security Audit Logs API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/useSecurityAuditLogs.ts)
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ app/_actions/admin.ts (isAdmin)
 *
 * Related Documentation:
 *   ├─ Original Server Action: app/_actions/plugin-security-audit-logs.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/app/_actions/admin";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { SecurityAuditLogEntry } from "@/lib/plugins/plugin-security/types";

// Re-export type for backward compatibility
export type { SecurityAuditLogEntry };

/**
 * GET /api/plugins/security/audit-logs - Get security audit logs (admin only)
 *
 * Query parameters:
 * - page?: number (default: 1)
 * - limit?: number (default: 50)
 * - sortBy?: "created_at" | "severity" | "event_type" | "plugin_id" (default: "created_at")
 * - sortOrder?: "asc" | "desc" (default: "desc")
 * - pluginId?: string
 * - userId?: string
 * - eventType?: string
 * - severity?: "low" | "medium" | "high" | "critical"
 * - searchQuery?: string
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   logs?: SecurityAuditLogEntry[],
 *   totalCount?: number
 * }
 */
export async function GET(request: NextRequest) {
	try {
		// Check admin permission
		const admin = await isAdmin();
		if (!admin) {
			return NextResponse.json(
				{
					error: "Unauthorized",
					message: "管理者権限が必要です",
					success: false,
				},
				{ status: 403 },
			);
		}

		const supabase = await createClient();
		const { searchParams } = new URL(request.url);

		const page = Number.parseInt(searchParams.get("page") || "1", 10);
		const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
		const sortBy =
			(searchParams.get("sortBy") as
				| "created_at"
				| "severity"
				| "event_type"
				| "plugin_id") || "created_at";
		const sortOrder =
			(searchParams.get("sortOrder") as "asc" | "desc") || "desc";
		const pluginId = searchParams.get("pluginId");
		const userId = searchParams.get("userId");
		const eventType = searchParams.get("eventType");
		const severity = searchParams.get("severity") as
			| "low"
			| "medium"
			| "high"
			| "critical"
			| null;
		const searchQuery = searchParams.get("searchQuery");

		const offset = (page - 1) * limit;

		let query = supabase
			.from("plugin_security_audit_logs")
			.select("*", { count: "exact" });

		// Apply filters
		if (pluginId) {
			query = query.eq("plugin_id", pluginId);
		}
		if (userId) {
			query = query.eq("user_id", userId);
		}
		if (eventType) {
			query = query.eq("event_type", eventType);
		}
		if (severity) {
			query = query.eq("severity", severity);
		}
		if (searchQuery && searchQuery.trim() !== "") {
			const search = `%${searchQuery.trim()}%`;
			query = query.or(`plugin_id.ilike.${search},event_type.ilike.${search}`);
		}

		// Apply sorting
		query = query.order(sortBy, { ascending: sortOrder === "asc" });

		// Apply pagination
		query = query.range(offset, offset + limit - 1);

		const { data, error, count } = await query;

		if (error) {
			logger.error({ error }, "Failed to fetch security audit logs");
			return NextResponse.json(
				{
					error: "Database error",
					message: `セキュリティ監査ログの取得中にエラーが発生しました。(詳細: ${error.message})`,
					success: false,
				},
				{ status: 500 },
			);
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

		return NextResponse.json({
			success: true,
			message: "セキュリティ監査ログを正常に取得しました。",
			logs,
			totalCount: count || 0,
		});
	} catch (error: unknown) {
		logger.error({ error }, "Failed to get security audit logs");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "セキュリティ監査ログの取得中にエラーが発生しました",
				success: false,
			},
			{ status: 500 },
		);
	}
}
