/**
 * Plugin Signatures API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/usePluginSignatures.ts)
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   ├─ lib/supabase/adminClient.ts (createAdminClient)
 *   ├─ lib/plugins/plugin-signature/signer.ts (signPlugin)
 *   └─ lib/plugins/plugin-signature/key-manager.ts (generateEd25519KeyPair, generateRSAKeyPair)
 *
 * Related Documentation:
 *   ├─ Original Server Action: app/_actions/plugin-signatures.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import {
	generateEd25519KeyPair,
	generateRSAKeyPair,
} from "@/lib/plugins/plugin-signature/key-manager";
import { signPlugin } from "@/lib/plugins/plugin-signature/signer";
import type { SignatureAlgorithm } from "@/lib/plugins/plugin-signature/types";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";
import type { PluginManifest } from "@/types/plugin";

export interface PluginSignatureInfo {
	pluginId: string;
	name: string;
	version: string;
	author: string;
	hasSignature: boolean;
	signature: string | null;
	publicKey: string | null;
	signatureAlgorithm: "ed25519" | "rsa" | null;
	signedAt: Date | null;
	isOfficial: boolean;
	isReviewed: boolean;
}

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
 * GET /api/plugins/signatures - Get plugins with signature information
 *
 * Query parameters:
 * - page?: number (default: 1)
 * - limit?: number (default: 50)
 * - sortBy?: "name" | "signed_at" | "signature_algorithm" (default: "name")
 * - sortOrder?: "asc" | "desc" (default: "asc")
 * - hasSignature?: boolean
 * - algorithm?: "ed25519" | "rsa"
 * - searchQuery?: string
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   plugins?: PluginSignatureInfo[],
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
			(searchParams.get("sortBy") as
				| "name"
				| "signed_at"
				| "signature_algorithm") || "name";
		const sortOrder =
			(searchParams.get("sortOrder") as "asc" | "desc") || "asc";
		const hasSignature = searchParams.get("hasSignature");
		const algorithm = searchParams.get("algorithm") as "ed25519" | "rsa" | null;
		const searchQuery = searchParams.get("searchQuery");

		let query = adminClient
			.from("plugins")
			.select(
				"plugin_id, name, version, author, signature, public_key, signature_algorithm, signed_at, is_official, is_reviewed",
				{ count: "exact" },
			);

		// Apply filters
		if (hasSignature !== null) {
			if (hasSignature === "true") {
				query = query.not("signature", "is", null);
			} else {
				query = query.is("signature", null);
			}
		}

		if (algorithm) {
			query = query.eq("signature_algorithm", algorithm);
		}

		if (searchQuery) {
			const search = searchQuery;
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
			logger.error({ error }, "Failed to fetch plugin signatures");
			return NextResponse.json(
				{
					error: "Database error",
					message: `プラグイン署名情報の取得に失敗しました: ${error.message}`,
				},
				{ status: 500 },
			);
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

		return NextResponse.json({
			success: true,
			plugins,
			totalCount: count || 0,
		});
	} catch (error: unknown) {
		logger.error({ error }, "Failed to get plugin signatures");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "プラグイン署名情報の取得中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/plugins/signatures - Generate and save plugin signature
 *
 * Request body:
 * {
 *   pluginId: string,
 *   privateKey?: string,
 *   algorithm?: "ed25519" | "rsa" (default: "ed25519"),
 *   generateNewKeyPair?: boolean
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   signature?: string,
 *   publicKey?: string,
 *   algorithm?: SignatureAlgorithm,
 *   signedAt?: Date
 * }
 */
export async function POST(request: NextRequest) {
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
		const supabase = await createClient();

		// Parse request body
		const body = (await request.json()) as {
			pluginId: string;
			privateKey?: string;
			algorithm?: SignatureAlgorithm;
			generateNewKeyPair?: boolean;
		};

		// Input validation
		if (!body.pluginId || typeof body.pluginId !== "string") {
			return NextResponse.json(
				{ error: "Bad request", message: "pluginIdは必須です" },
				{ status: 400 },
			);
		}

		const algorithm = body.algorithm || "ed25519";

		// Get plugin data
		const { data: plugin, error: pluginError } = await adminClient
			.from("plugins")
			.select("manifest, code_url")
			.eq("plugin_id", body.pluginId)
			.single();

		if (pluginError || !plugin) {
			return NextResponse.json(
				{
					error: "Not found",
					message: `プラグインが見つかりません: ${body.pluginId}`,
				},
				{ status: 404 },
			);
		}

		const manifest = plugin.manifest as unknown as PluginManifest;

		// Fetch plugin code from Storage
		const codeUrl = plugin.code_url;
		if (!codeUrl) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "プラグインコードURLが見つかりません",
				},
				{ status: 400 },
			);
		}

		let code: string;
		try {
			// Try to extract path from code_url
			// Format: https://<project>.supabase.co/storage/v1/object/public/plugins/<path>
			const urlParts = codeUrl.split("/plugins/");
			const storagePath = urlParts.length > 1 ? urlParts[1] : codeUrl;

			// Get signed URL from Storage
			const { data: storageData, error: storageError } = await supabase.storage
				.from("plugins")
				.createSignedUrl(storagePath, 60);

			if (storageError || !storageData?.signedUrl) {
				// Fallback: try direct fetch
				const response = await fetch(codeUrl);
				if (!response.ok) {
					throw new Error(
						`Failed to fetch plugin code: ${response.statusText}`,
					);
				}
				code = await response.text();
			} else {
				const response = await fetch(storageData.signedUrl);
				if (!response.ok) {
					throw new Error(
						`Failed to fetch plugin code: ${response.statusText}`,
					);
				}
				code = await response.text();
			}
		} catch (error) {
			logger.error(
				{ error, pluginId: body.pluginId, codeUrl },
				"Failed to fetch plugin code for signing",
			);
			return NextResponse.json(
				{
					error: "Failed to fetch code",
					message: `プラグインコードの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				},
				{ status: 500 },
			);
		}

		// Generate key pair if requested
		let keyPair: { publicKey: string; privateKey: string } | undefined;
		let finalPrivateKey = body.privateKey;
		let finalPublicKey: string | undefined;

		if (body.generateNewKeyPair) {
			logger.info(
				{ pluginId: body.pluginId, algorithm },
				"Generating new key pair",
			);
			keyPair =
				algorithm === "ed25519"
					? generateEd25519KeyPair()
					: generateRSAKeyPair();
			finalPrivateKey = keyPair.privateKey;
			finalPublicKey = keyPair.publicKey;
		}

		if (!finalPrivateKey) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "privateKeyまたはgenerateNewKeyPairが必要です",
				},
				{ status: 400 },
			);
		}

		// Generate signature
		logger.info(
			{ pluginId: body.pluginId, algorithm },
			"Generating plugin signature",
		);
		const signature = signPlugin(manifest, code, {
			privateKey: finalPrivateKey,
			publicKey: finalPublicKey,
			algorithm,
		});

		// Get public key from signature or keyPair
		const publicKey = signature.publicKey || finalPublicKey;
		if (!publicKey) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "公開鍵が必要ですが利用できません",
				},
				{ status: 400 },
			);
		}

		// Save signature to database
		const { error: updateError } = await adminClient
			.from("plugins")
			.update({
				signature: signature.signature,
				public_key: publicKey,
				signature_algorithm: signature.algorithm,
				signed_at: new Date(signature.signatureData.timestamp).toISOString(),
			})
			.eq("plugin_id", body.pluginId);

		if (updateError) {
			logger.error(
				{ error: updateError, pluginId: body.pluginId },
				"Failed to save signature to database",
			);
			return NextResponse.json(
				{
					error: "Database error",
					message: `署名の保存に失敗しました: ${updateError.message}`,
				},
				{ status: 500 },
			);
		}

		logger.info(
			{ pluginId: body.pluginId, algorithm: signature.algorithm },
			"Plugin signature generated and saved successfully",
		);

		return NextResponse.json({
			success: true,
			signature: signature.signature,
			publicKey,
			algorithm: signature.algorithm,
			signedAt: new Date(signature.signatureData.timestamp),
		});
	} catch (error: unknown) {
		logger.error({ error }, "Failed to generate plugin signature");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "プラグイン署名の生成中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
