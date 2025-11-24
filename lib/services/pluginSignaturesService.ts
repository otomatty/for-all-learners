/**
 * Plugin Signatures Service
 *
 * Server-side functions for plugin signatures management
 * These functions can be used in server components and API routes
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this service):
 *   ├─ app/admin/plugins/signatures/page.tsx
 *   └─ (Future: Other server components that need plugin signatures)
 *
 * Dependencies (External files that this service uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/supabase/adminClient.ts (createAdminClient)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import type {
	PluginSignatureInfo,
	SignatureVerificationLog,
} from "@/lib/plugins/plugin-signature/types";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";

export interface GetPluginSignaturesOptions {
	page?: number;
	limit?: number;
	sortBy?: "name" | "signed_at" | "signature_algorithm";
	sortOrder?: "asc" | "desc";
	filters?: {
		hasSignature?: boolean;
		algorithm?: "ed25519" | "rsa";
		searchQuery?: string;
	};
}

export interface GetPluginSignaturesResult {
	success: boolean;
	message?: string;
	plugins?: PluginSignatureInfo[];
	totalCount?: number;
}

export interface GetSignatureVerificationLogsOptions {
	page?: number;
	limit?: number;
	sortBy?: "verified_at" | "verification_result";
	sortOrder?: "asc" | "desc";
}

export interface GetSignatureVerificationLogsResult {
	success: boolean;
	message?: string;
	logs?: SignatureVerificationLog[];
	totalCount?: number;
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
 * Get plugin signatures (server-side)
 */
export async function getPluginSignaturesServer(
	options: GetPluginSignaturesOptions = {},
): Promise<GetPluginSignaturesResult> {
	try {
		// Check admin access
		const adminCheck = await checkAdminAccess();
		if (!adminCheck.isAdmin) {
			return {
				success: false,
				message: "管理者権限が必要です",
			};
		}

		const adminClient = createAdminClient();
		const page = options.page || 1;
		const limit = options.limit || 50;
		const sortBy = options.sortBy || "name";
		const sortOrder = options.sortOrder || "asc";
		const filters = options.filters || {};

		let query = adminClient
			.from("plugins")
			.select(
				"plugin_id, name, version, author, signature, public_key, signature_algorithm, signed_at, is_official, is_reviewed",
				{ count: "exact" },
			);

		// Apply filters
		if (filters.hasSignature !== undefined) {
			if (filters.hasSignature) {
				query = query.not("signature", "is", null);
			} else {
				query = query.is("signature", null);
			}
		}

		if (filters.algorithm) {
			query = query.eq("signature_algorithm", filters.algorithm);
		}

		if (filters.searchQuery) {
			const search = filters.searchQuery;
			query = query.or(
				`name.ilike.%${search}%,plugin_id.ilike.%${search}%,author.ilike.%${search}%`,
			);
		}

		// Apply sorting
		switch (sortBy) {
			case "signed_at":
				query = query.order("signed_at", {
					ascending: sortOrder === "asc",
					nullsFirst: false,
				});
				break;
			case "signature_algorithm":
				query = query.order("signature_algorithm", {
					ascending: sortOrder === "asc",
					nullsFirst: false,
				});
				break;
			default:
				query = query.order("name", { ascending: sortOrder === "asc" });
				break;
		}

		// Apply pagination
		const from = (page - 1) * limit;
		const to = from + limit - 1;
		query = query.range(from, to);

		const { data, error, count } = await query;

		if (error) {
			return {
				success: false,
				message: `プラグイン署名情報の取得に失敗しました: ${error.message}`,
			};
		}

		const plugins: PluginSignatureInfo[] = (data || []).map((row) => ({
			pluginId: row.plugin_id,
			name: row.name || "",
			version: row.version || "",
			author: row.author || "",
			hasSignature: !!row.signature,
			signature: row.signature,
			publicKey: row.public_key,
			signatureAlgorithm:
				(row.signature_algorithm as "ed25519" | "rsa") || null,
			signedAt: row.signed_at ? new Date(row.signed_at) : null,
			isOfficial: row.is_official || false,
			isReviewed: row.is_reviewed || false,
		}));

		return {
			success: true,
			plugins,
			totalCount: count || 0,
		};
	} catch (error: unknown) {
		return {
			success: false,
			message: `プラグイン署名情報の取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

/**
 * Get signature verification logs (server-side)
 */
export async function getSignatureVerificationLogsServer(
	options: GetSignatureVerificationLogsOptions = {},
): Promise<GetSignatureVerificationLogsResult> {
	try {
		// Check admin access
		const adminCheck = await checkAdminAccess();
		if (!adminCheck.isAdmin) {
			return {
				success: false,
				message: "管理者権限が必要です",
			};
		}

		const adminClient = createAdminClient();
		const page = options.page || 1;
		const limit = options.limit || 50;
		const sortBy = options.sortBy || "verified_at";
		const sortOrder = options.sortOrder || "desc";

		let query = adminClient
			.from("plugin_signature_verifications")
			.select("*", { count: "exact" });

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
			return {
				success: false,
				message: `署名検証ログの取得に失敗しました: ${error.message}`,
			};
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

		return {
			success: true,
			logs,
			totalCount: count || 0,
		};
	} catch (error: unknown) {
		return {
			success: false,
			message: `署名検証ログの取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}
