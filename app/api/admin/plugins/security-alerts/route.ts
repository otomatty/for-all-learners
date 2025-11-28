import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import {
	getAlertStatisticsServer,
	getPluginSecurityAlertsServer,
} from "@/lib/services/pluginSecurityService";

/**
 * セキュリティアラート取得APIエンドポイント
 * GET /api/admin/plugins/security-alerts
 */
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const page = Number(url.searchParams.get("page")) || 1;
		const limit = Number(url.searchParams.get("limit")) || 50;
		const sortBy =
			(url.searchParams.get("sortBy") as
				| "created_at"
				| "severity"
				| "status") || "created_at";
		const sortOrder =
			(url.searchParams.get("sortOrder") as "asc" | "desc") || "desc";
		const searchQuery = url.searchParams.get("searchQuery") || undefined;
		const pluginId = url.searchParams.get("pluginId") || undefined;
		const status =
			(url.searchParams.get("status") as
				| "open"
				| "acknowledged"
				| "resolved"
				| "dismissed") || undefined;
		const severity =
			(url.searchParams.get("severity") as
				| "low"
				| "medium"
				| "high"
				| "critical") || undefined;
		const alertType = url.searchParams.get("alertType") || undefined;

		const [alertsResult, statsResult] = await Promise.all([
			getPluginSecurityAlertsServer({
				page,
				limit,
				sortBy,
				sortOrder,
				filters: {
					status,
					severity,
					alertType,
					pluginId,
					searchQuery,
				},
			}),
			getAlertStatisticsServer(),
		]);

		if (!alertsResult.success) {
			return NextResponse.json(
				{
					error:
						alertsResult.message || "セキュリティアラートの取得に失敗しました",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			alerts: alertsResult.alerts || [],
			totalCount: alertsResult.totalCount || 0,
			stats: statsResult.stats || null,
		});
	} catch (error) {
		logger.error({ error }, "Security alerts API error");
		return NextResponse.json(
			{ error: "セキュリティアラートの取得に失敗しました" },
			{ status: 500 },
		);
	}
}
