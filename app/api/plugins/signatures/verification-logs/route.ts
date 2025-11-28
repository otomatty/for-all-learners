/**
 * Plugin Signature Verification Logs API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/usePluginSignatureVerificationLogs.ts)
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/supabase/adminClient.ts (createAdminClient)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";

export interface SignatureVerificationLog {
	id: string;
	pluginId: string;
	userId: string | null;
	verificationResult: "valid" | "invalid" | "missing" | "error";
	errorMessage: string | null;
	verifiedAt: Date;
}

/**
 * Check if user is admin
 */
async function checkAdminAccess(): Promise<{
	isAdmin: boolean;
	userId?: string;
}> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { isAdmin: false };
	}

	const { data: adminCheck } = await supabase
		.from("admin_users")
		.select("id")
		.eq("user_id", user.id)
		.eq("is_active", true)
		.single();

	return {
		isAdmin: !!adminCheck,
		userId: user.id,
	};
}

/**
 * GET /api/plugins/signatures/verification-logs - Get signature verification logs
 *
 * Query parameters:
 * - page?: number (default: 1)
 * - limit?: number (default: 50)
 * - pluginId?: string
 * - verificationResult?: "valid" | "invalid" | "missing" | "error"
 * - sortBy?: "verified_at" | "verification_result" (default: "verified_at")
 * - sortOrder?: "asc" | "desc" (default: "desc")
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   logs?: SignatureVerificationLog[],
 *   totalCount?: number
 * }
 */
export async function GET(request: NextRequest) {
	try {
		// Check admin access
		const adminCheck = await checkAdminAccess();
		if (!adminCheck.isAdmin) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "管理者権限が必要です" },
				{ status: 403 },
			);
		}

		const adminClient = createAdminClient();
		const { searchParams } = new URL(request.url);

		const page = Number.parseInt(searchParams.get("page") || "1", 10);
		const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
		const sortBy =
			(searchParams.get("sortBy") as "verified_at" | "verification_result") ||
			"verified_at";
		const sortOrder =
			(searchParams.get("sortOrder") as "asc" | "desc") || "desc";
		const pluginId = searchParams.get("pluginId");
		const verificationResult = searchParams.get("verificationResult") as
			| "valid"
			| "invalid"
			| "missing"
			| "error"
			| null;

		let query = adminClient
			.from("plugin_signature_verifications")
			.select("*", { count: "exact" });

		// Apply filters
		if (pluginId) {
			query = query.eq("plugin_id", pluginId);
		}

		if (verificationResult) {
			query = query.eq("verification_result", verificationResult);
		}

		// Apply sorting
		if (sortBy === "verification_result") {
			query = query.order("verification_result", {
				ascending: sortOrder === "asc",
			});
		} else {
			query = query.order("verified_at", {
				ascending: sortOrder === "asc",
			});
		}

		// Apply pagination
		const from = (page - 1) * limit;
		const to = from + limit - 1;
		query = query.range(from, to);

		const { data, error, count } = await query;

		if (error) {
			logger.error({ error }, "Failed to fetch verification logs");
			return NextResponse.json(
				{
					error: "Database error",
					message: `署名検証ログの取得に失敗しました: ${error.message}`,
				},
				{ status: 500 },
			);
		}

		const logs: SignatureVerificationLog[] = (data || []).map((row) => ({
			id: row.id,
			pluginId: row.plugin_id,
			userId: row.user_id || null,
			verificationResult: row.verification_result as
				| "valid"
				| "invalid"
				| "missing"
				| "error",
			errorMessage: row.error_message || null,
			verifiedAt: new Date(row.verified_at || new Date()),
		}));

		return NextResponse.json({
			success: true,
			logs,
			totalCount: count || 0,
		});
	} catch (error: unknown) {
		logger.error({ error }, "Failed to get signature verification logs");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "署名検証ログの取得中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
