/**
 * Plugin Publish API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ (Future: hooks/plugins/usePublishPlugin.ts)
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   ├─ lib/plugins/plugin-publisher.ts (publishPluginToMarketplace)
 *   └─ node:fs, node:path (filesystem operations)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { publishPluginToMarketplace } from "@/lib/plugins/plugin-publisher";
import { createClient } from "@/lib/supabase/server";
import type { PluginManifest } from "@/types/plugin";

const __filename = fileURLToPath(import.meta.url);
// Get project root (app/api/plugins/publish -> app/api/plugins -> app/api -> app -> root)
const projectRoot = join(dirname(__filename), "../../../..");
const PLUGINS_DIR = join(projectRoot, "plugins/examples");

/**
 * Find plugin directory by plugin ID
 *
 * This function searches for a plugin directory by:
 * 1. Trying kebab-case version of plugin ID (e.g., "com.example.plugin" -> "com-example-plugin")
 * 2. Trying direct match
 * 3. Scanning all directories and matching manifest.id
 */
function findPluginDir(pluginId: string): string | null {
	// Try kebab-case version first (most common case)
	const kebabId = pluginId.replace(/\./g, "-");
	const kebabPath = join(PLUGINS_DIR, kebabId);
	if (existsSync(kebabPath)) {
		return kebabPath;
	}

	// Try direct match
	const directPath = join(PLUGINS_DIR, pluginId);
	if (existsSync(directPath)) {
		return directPath;
	}

	// Search all directories for matching manifest.id
	if (!existsSync(PLUGINS_DIR)) {
		return null;
	}

	const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const pluginDir = join(PLUGINS_DIR, entry.name);
		const manifestPath = join(pluginDir, "plugin.json");

		if (!existsSync(manifestPath)) {
			continue;
		}

		try {
			const manifestContent = readFileSync(manifestPath, "utf-8");
			const manifest = JSON.parse(manifestContent) as PluginManifest;

			if (manifest.id === pluginId) {
				return pluginDir;
			}
		} catch {
			// Skip invalid manifests
		}
	}

	return null;
}

/**
 * POST /api/plugins/publish - Publish a local plugin to the marketplace
 *
 * Request body:
 * {
 *   pluginId: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   pluginId?: string,
 *   codeUrl?: string
 * }
 */
export async function POST(request: NextRequest) {
	try {
		// 1. Authentication check
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "ユーザーが認証されていません" },
				{ status: 401 },
			);
		}

		// 2. Parse request body
		const body = (await request.json()) as { pluginId: string };

		// 3. Input validation
		if (!body.pluginId || typeof body.pluginId !== "string") {
			return NextResponse.json(
				{ error: "Bad request", message: "pluginIdは必須です" },
				{ status: 400 },
			);
		}

		logger.info(
			{ userId: user.id, pluginId: body.pluginId },
			"Publishing plugin",
		);

		// 4. Find plugin directory
		const pluginDir = findPluginDir(body.pluginId);
		if (!pluginDir) {
			return NextResponse.json(
				{
					error: "Not found",
					message: `プラグインが見つかりません: ${body.pluginId}`,
				},
				{ status: 404 },
			);
		}

		// 5. Call common publish function
		const result = await publishPluginToMarketplace(
			body.pluginId,
			supabase,
			pluginDir,
		);

		if (!result.success) {
			return NextResponse.json(
				{
					error: "Publish failed",
					message: result.message || "プラグインの公開に失敗しました",
				},
				{ status: 500 },
			);
		}

		logger.info(
			{ userId: user.id, pluginId: body.pluginId },
			"Plugin published successfully",
		);

		return NextResponse.json({
			success: true,
			message: result.message,
			pluginId: result.pluginId,
			codeUrl: result.codeUrl,
		});
	} catch (error: unknown) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to publish plugin",
		);

		return NextResponse.json(
			{
				error: "Internal server error",
				message: "プラグインの公開中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
