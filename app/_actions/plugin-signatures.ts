/**
 * Server Actions for Plugin Signature Management
 *
 * DEPENDENCY MAP:
 *
 * Parents:
 *   ├─ app/admin/plugins/signatures/page.tsx
 *   └─ app/admin/plugins/signatures/_components/SignPluginDialog.tsx
 *
 * Dependencies:
 *   ├─ lib/supabase/server
 *   ├─ lib/supabase/admin
 *   ├─ lib/plugins/plugin-signature/signer.ts
 *   └─ lib/plugins/plugin-signature/key-manager.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-code-signing.md
 */

"use server";

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

/**
 * Get plugins with signature information
 */
export async function getPluginSignatures(
	options: GetPluginSignaturesOptions = {},
): Promise<GetPluginSignaturesResult> {
	try {
		const adminClient = createAdminClient();
		const supabase = await createClient();

		// Check admin access
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return {
				success: false,
				message: "Unauthorized: User not authenticated",
			};
		}

		// Check if user is admin (using regular client for RLS check)
		const { data: adminCheck } = await supabase
			.from("admin_users")
			.select("id")
			.eq("user_id", user.id)
			.eq("is_active", true)
			.single();

		if (!adminCheck) {
			return {
				success: false,
				message: "Unauthorized: Admin access required",
			};
		}

		const page = options.page || 1;
		const limit = options.limit || 50;
		const sortBy = options.sortBy || "name";
		const sortOrder = options.sortOrder || "asc";

		let query = adminClient
			.from("plugins")
			.select(
				"plugin_id, name, version, author, signature, public_key, signature_algorithm, signed_at, is_official, is_reviewed",
				{ count: "exact" },
			);

		// Apply filters
		if (options.filters?.hasSignature !== undefined) {
			if (options.filters.hasSignature) {
				query = query.not("signature", "is", null);
			} else {
				query = query.is("signature", null);
			}
		}

		if (options.filters?.algorithm) {
			query = query.eq("signature_algorithm", options.filters.algorithm);
		}

		if (options.filters?.searchQuery) {
			const search = options.filters.searchQuery;
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
				message: `Failed to fetch plugins: ${error.message}`,
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
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get signature verification logs
 */
export async function getSignatureVerificationLogs(options?: {
	page?: number;
	limit?: number;
	pluginId?: string;
	verificationResult?: "valid" | "invalid" | "missing" | "error";
	sortBy?: "verified_at" | "verification_result";
	sortOrder?: "asc" | "desc";
}): Promise<{
	success: boolean;
	message?: string;
	logs?: SignatureVerificationLog[];
	totalCount?: number;
}> {
	try {
		const adminClient = createAdminClient();
		const supabase = await createClient();

		// Check admin access
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return {
				success: false,
				message: "Unauthorized: User not authenticated",
			};
		}

		// Check if user is admin
		const { data: adminCheck } = await supabase
			.from("admin_users")
			.select("id")
			.eq("user_id", user.id)
			.eq("is_active", true)
			.single();

		if (!adminCheck) {
			return {
				success: false,
				message: "Unauthorized: Admin access required",
			};
		}

		const page = options?.page || 1;
		const limit = options?.limit || 50;
		const sortBy = options?.sortBy || "verified_at";
		const sortOrder = options?.sortOrder || "desc";

		let query = adminClient
			.from("plugin_signature_verifications")
			.select("*", { count: "exact" });

		// Apply filters
		if (options?.pluginId) {
			query = query.eq("plugin_id", options.pluginId);
		}

		if (options?.verificationResult) {
			query = query.eq("verification_result", options.verificationResult);
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
			return {
				success: false,
				message: `Failed to fetch verification logs: ${error.message}`,
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
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Generate and save plugin signature
 */
export async function generatePluginSignature(
	pluginId: string,
	privateKey: string,
	algorithm: SignatureAlgorithm = "ed25519",
	generateNewKeyPair?: boolean,
): Promise<{
	success: boolean;
	message?: string;
	signature?: string;
	publicKey?: string;
	algorithm?: SignatureAlgorithm;
	signedAt?: Date;
}> {
	try {
		const adminClient = createAdminClient();
		const supabase = await createClient();

		// Check admin access
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return {
				success: false,
				message: "Unauthorized: User not authenticated",
			};
		}

		// Check if user is admin
		const { data: adminCheck } = await supabase
			.from("admin_users")
			.select("id")
			.eq("user_id", user.id)
			.eq("is_active", true)
			.single();

		if (!adminCheck) {
			return {
				success: false,
				message: "Unauthorized: Admin access required",
			};
		}

		// Get plugin data
		const { data: plugin, error: pluginError } = await adminClient
			.from("plugins")
			.select("manifest, code_url")
			.eq("plugin_id", pluginId)
			.single();

		if (pluginError || !plugin) {
			return {
				success: false,
				message: `Plugin not found: ${pluginId}`,
			};
		}

		const manifest = plugin.manifest as unknown as PluginManifest;

		// Fetch plugin code from Storage
		const codeUrl = plugin.code_url;
		if (!codeUrl) {
			return {
				success: false,
				message: "Plugin code URL not found",
			};
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
				{ error, pluginId, codeUrl },
				"Failed to fetch plugin code for signing",
			);
			return {
				success: false,
				message: `Failed to fetch plugin code: ${error instanceof Error ? error.message : String(error)}`,
			};
		}

		// Generate key pair if requested
		let keyPair: { publicKey: string; privateKey: string } | undefined;
		let finalPrivateKey = privateKey;
		let finalPublicKey: string | undefined;

		if (generateNewKeyPair) {
			logger.info({ pluginId, algorithm }, "Generating new key pair");
			keyPair =
				algorithm === "ed25519"
					? generateEd25519KeyPair()
					: generateRSAKeyPair();
			finalPrivateKey = keyPair.privateKey;
			finalPublicKey = keyPair.publicKey;
		}

		// Generate signature
		logger.info({ pluginId, algorithm }, "Generating plugin signature");
		const signature = signPlugin(manifest, code, {
			privateKey: finalPrivateKey,
			publicKey: finalPublicKey,
			algorithm,
		});

		// Get public key from signature or keyPair
		const publicKey = signature.publicKey || finalPublicKey;
		if (!publicKey) {
			return {
				success: false,
				message: "Public key is required but not available",
			};
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
			.eq("plugin_id", pluginId);

		if (updateError) {
			logger.error(
				{ error: updateError, pluginId },
				"Failed to save signature to database",
			);
			return {
				success: false,
				message: `Failed to save signature: ${updateError.message}`,
			};
		}

		logger.info(
			{ pluginId, algorithm: signature.algorithm },
			"Plugin signature generated and saved successfully",
		);

		return {
			success: true,
			signature: signature.signature,
			publicKey,
			algorithm: signature.algorithm,
			signedAt: new Date(signature.signatureData.timestamp),
		};
	} catch (error) {
		logger.error({ error, pluginId }, "Failed to generate plugin signature");
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Generate a new key pair for plugin signing
 */
export async function generateKeyPair(
	algorithm: SignatureAlgorithm = "ed25519",
): Promise<{
	success: boolean;
	message?: string;
	publicKey?: string;
	privateKey?: string;
}> {
	try {
		const supabase = await createClient();

		// Check admin access
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return {
				success: false,
				message: "Unauthorized: User not authenticated",
			};
		}

		// Check if user is admin
		const { data: adminCheck } = await supabase
			.from("admin_users")
			.select("id")
			.eq("user_id", user.id)
			.eq("is_active", true)
			.single();

		if (!adminCheck) {
			return {
				success: false,
				message: "Unauthorized: Admin access required",
			};
		}

		// Generate key pair
		const keyPair =
			algorithm === "ed25519" ? generateEd25519KeyPair() : generateRSAKeyPair();

		return {
			success: true,
			publicKey: keyPair.publicKey,
			privateKey: keyPair.privateKey,
		};
	} catch (error) {
		logger.error({ error, algorithm }, "Failed to generate key pair");
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
