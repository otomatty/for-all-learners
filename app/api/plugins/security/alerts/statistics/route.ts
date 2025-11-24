/**
 * Plugin Security Alert Statistics API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/useAlertStatistics.ts)
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/supabase/adminClient.ts (createAdminClient)
 *
 * Related Documentation:
 *   ├─ Original Server Action: app/_actions/plugin-security-alerts.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/plugins/security/alerts/statistics - Get alert statistics
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   stats?: {
 *     totalAlerts: number,
 *     openAlerts: number,
 *     acknowledgedAlerts: number,
 *     resolvedAlerts: number,
 *     criticalAlerts: number,
 *     highAlerts: number,
 *     mediumAlerts: number,
 *     lowAlerts: number
 *   }
 * }
 */
export async function GET(_request: NextRequest) {
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

		// Get all alerts for statistics
		const { data, error } = await adminClient
			.from("plugin_security_alerts")
			.select("status, severity");

		if (error) {
			logger.error({ error }, "Failed to fetch alert statistics");
			return NextResponse.json(
				{
					error: "Database error",
					message: `アラート統計の取得に失敗しました: ${error.message}`,
					success: false,
				},
				{ status: 500 },
			);
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

		return NextResponse.json({
			success: true,
			stats,
		});
	} catch (error: unknown) {
		logger.error({ error }, "Failed to get alert statistics");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "アラート統計の取得中にエラーが発生しました",
				success: false,
			},
			{ status: 500 },
		);
	}
}
