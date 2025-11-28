import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import {
	type GetSecurityAuditLogsOptions,
	getSecurityAuditLogsServer,
	getSecurityAuditStatsServer,
} from "@/lib/services/pluginSecurityService";

/**
 * セキュリティ監査ログ取得APIエンドポイント
 * GET /api/admin/plugins/security-audit
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
				| "event_type"
				| "plugin_id") || "created_at";
		const sortOrder =
			(url.searchParams.get("sortOrder") as "asc" | "desc") || "desc";
		const searchQuery = url.searchParams.get("searchQuery") || undefined;
		const pluginId = url.searchParams.get("pluginId") || undefined;
		const userId = url.searchParams.get("userId") || undefined;
		const eventType = url.searchParams.get("eventType") || undefined;
		const severity =
			(url.searchParams.get("severity") as
				| "low"
				| "medium"
				| "high"
				| "critical") || undefined;

		const options: GetSecurityAuditLogsOptions = {
			page,
			limit,
			sortBy,
			sortOrder,
			filters: {
				pluginId,
				userId,
				eventType,
				severity,
				searchQuery,
			},
		};

		const [logsResult, statsResult] = await Promise.all([
			getSecurityAuditLogsServer(options),
			getSecurityAuditStatsServer(),
		]);

		if (!logsResult.success) {
			return NextResponse.json(
				{
					error:
						logsResult.message || "セキュリティ監査ログの取得に失敗しました",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			logs: logsResult.logs || [],
			totalCount: logsResult.totalCount || 0,
			stats: statsResult,
		});
	} catch (error) {
		logger.error({ error }, "Security audit logs API error");
		return NextResponse.json(
			{ error: "セキュリティ監査ログの取得に失敗しました" },
			{ status: 500 },
		);
	}
}
