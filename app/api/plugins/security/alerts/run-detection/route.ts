/**
 * Plugin Security Anomaly Detection API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/useRunAnomalyDetection.ts)
 *
 * Dependencies (External files that this route uses):
 *   ├─ app/_actions/admin.ts (isAdmin)
 *   └─ lib/plugins/plugin-security-anomaly-detector.ts (getAnomalyDetector)
 *
 * Related Documentation:
 *   ├─ Original Server Action: app/_actions/plugin-security-alerts.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/app/_actions/admin";
import logger from "@/lib/logger";
import { getAnomalyDetector } from "@/lib/plugins/plugin-security-anomaly-detector";

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
		// Check admin access
		if (!(await isAdmin())) {
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
