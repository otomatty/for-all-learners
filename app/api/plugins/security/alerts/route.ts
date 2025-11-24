/**
 * Plugin Security Alerts API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/useSecurityAlerts.ts)
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   ├─ lib/supabase/adminClient.ts (createAdminClient)
 *   └─ lib/plugins/plugin-security-anomaly-detector.ts (getAnomalyDetector)
 *
 * Related Documentation:
 *   ├─ Original Server Action: app/_actions/plugin-security-alerts.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import type { PluginSecurityAlert } from "@/lib/plugins/plugin-security/types";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type AlertRow = Database["public"]["Tables"]["plugin_security_alerts"]["Row"];

// Re-export type for backward compatibility
export type { PluginSecurityAlert };

/**
 * GET /api/plugins/security/alerts - Get plugin security alerts
 *
 * Query parameters:
 * - page?: number (default: 1)
 * - limit?: number (default: 50)
 * - sortBy?: "created_at" | "severity" | "status" (default: "created_at")
 * - sortOrder?: "asc" | "desc" (default: "desc")
 * - status?: "open" | "acknowledged" | "resolved" | "dismissed"
 * - severity?: "low" | "medium" | "high" | "critical"
 * - alertType?: string
 * - pluginId?: string
 * - searchQuery?: string
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   alerts?: PluginSecurityAlert[],
 *   totalCount?: number
 * }
 */
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();

		// Check admin access
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{
					error: "Unauthorized",
					message: "認証が必要です",
					success: false,
				},
				{ status: 401 },
			);
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

		const adminClient = createAdminClient();
		const { searchParams } = new URL(request.url);

		const page = Number.parseInt(searchParams.get("page") || "1", 10);
		const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
		const sortBy =
			(searchParams.get("sortBy") as "created_at" | "severity" | "status") ||
			"created_at";
		const sortOrder =
			(searchParams.get("sortOrder") as "asc" | "desc") || "desc";
		const status = searchParams.get("status") as
			| "open"
			| "acknowledged"
			| "resolved"
			| "dismissed"
			| null;
		const severity = searchParams.get("severity") as
			| "low"
			| "medium"
			| "high"
			| "critical"
			| null;
		const alertType = searchParams.get("alertType");
		const pluginId = searchParams.get("pluginId");
		const searchQuery = searchParams.get("searchQuery");

		let query = adminClient
			.from("plugin_security_alerts")
			.select("*", { count: "exact" });

		// Apply filters
		if (status) {
			query = query.eq("status", status);
		}

		if (severity) {
			query = query.eq("severity", severity);
		}

		if (alertType) {
			query = query.eq("alert_type", alertType);
		}

		if (pluginId) {
			query = query.eq("plugin_id", pluginId);
		}

		if (searchQuery) {
			const search = searchQuery;
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
			logger.error({ error }, "Failed to fetch security alerts");
			return NextResponse.json(
				{
					error: "Database error",
					message: `セキュリティアラートの取得に失敗しました: ${error.message}`,
					success: false,
				},
				{ status: 500 },
			);
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

		return NextResponse.json({
			success: true,
			alerts,
			totalCount: count || 0,
		});
	} catch (error: unknown) {
		logger.error({ error }, "Failed to get plugin security alerts");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "セキュリティアラートの取得中にエラーが発生しました",
				success: false,
			},
			{ status: 500 },
		);
	}
}
