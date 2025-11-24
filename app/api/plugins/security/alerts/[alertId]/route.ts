/**
 * Plugin Security Alert Update API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/useUpdateAlertStatus.ts)
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
 * PATCH /api/plugins/security/alerts/[alertId] - Update alert status
 *
 * Request body:
 * {
 *   status: "open" | "acknowledged" | "resolved" | "dismissed"
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string
 * }
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ alertId: string }> },
) {
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
		const { alertId } = await params;

		// Parse request body
		const body = (await request.json()) as {
			status: "open" | "acknowledged" | "resolved" | "dismissed";
		};

		// Input validation
		if (
			!body.status ||
			!["open", "acknowledged", "resolved", "dismissed"].includes(body.status)
		) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "有効なstatusが必要です",
					success: false,
				},
				{ status: 400 },
			);
		}

		const updateData: {
			status: string;
			acknowledged_by?: string | null;
			acknowledged_at?: string | null;
			resolved_at?: string | null;
			updated_at: string;
		} = {
			status: body.status,
			updated_at: new Date().toISOString(),
		};

		if (body.status === "acknowledged") {
			updateData.acknowledged_by = user.id;
			updateData.acknowledged_at = new Date().toISOString();
		}

		if (body.status === "resolved") {
			updateData.resolved_at = new Date().toISOString();
		}

		const { error } = await adminClient
			.from("plugin_security_alerts")
			.update(updateData)
			.eq("id", alertId);

		if (error) {
			logger.error({ error, alertId }, "Failed to update alert status");
			return NextResponse.json(
				{
					error: "Database error",
					message: `アラートステータスの更新に失敗しました: ${error.message}`,
					success: false,
				},
				{ status: 500 },
			);
		}

		logger.info({ alertId, status: body.status }, "Alert status updated");
		return NextResponse.json({
			success: true,
		});
	} catch (error: unknown) {
		logger.error(
			{ error, alertId: (await params).alertId },
			"Failed to update alert status",
		);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "アラートステータスの更新中にエラーが発生しました",
				success: false,
			},
			{ status: 500 },
		);
	}
}
