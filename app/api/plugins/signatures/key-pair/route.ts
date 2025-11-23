/**
 * Plugin Signature Key Pair API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/useGenerateKeyPair.ts)
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
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
import type { SignatureAlgorithm } from "@/lib/plugins/plugin-signature/types";
import { createClient } from "@/lib/supabase/server";

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
 * POST /api/plugins/signatures/key-pair - Generate a new key pair for plugin signing
 *
 * Request body:
 * {
 *   algorithm?: "ed25519" | "rsa" (default: "ed25519")
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   publicKey?: string,
 *   privateKey?: string
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

		// Parse request body
		const body = (await request.json()) as {
			algorithm?: SignatureAlgorithm;
		};

		const algorithm = body.algorithm || "ed25519";

		// Generate key pair
		const keyPair =
			algorithm === "ed25519" ? generateEd25519KeyPair() : generateRSAKeyPair();

		logger.info({ userId: adminCheck.userId, algorithm }, "Key pair generated");

		return NextResponse.json({
			success: true,
			publicKey: keyPair.publicKey,
			privateKey: keyPair.privateKey,
		});
	} catch (error: unknown) {
		logger.error({ error }, "Failed to generate key pair");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "キーペアの生成中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
