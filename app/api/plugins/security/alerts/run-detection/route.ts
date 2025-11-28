/**
 * Plugin Security Anomaly Detection API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/useRunAnomalyDetection.ts)
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/plugins/plugin-security-anomaly-detector.ts (getAnomalyDetector)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { getAnomalyDetector } from "@/lib/plugins/plugin-security-anomaly-detector";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/plugins/security/alerts/run-detection - Run anomaly detection manually
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   alertCount?: number
 * }
 */
export async function POST(_request: NextRequest) {
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

		const detector = getAnomalyDetector();
		const alertCount = await detector.runDetection();

		logger.info({ alertCount }, "Anomaly detection completed");

		return NextResponse.json({
			success: true,
			alertCount,
		});
	} catch (error: unknown) {
		logger.error({ error }, "Failed to run anomaly detection");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "異常検知の実行中にエラーが発生しました",
				success: false,
			},
			{ status: 500 },
		);
	}
}
