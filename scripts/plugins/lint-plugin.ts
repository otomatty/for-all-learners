/**
 * Lint Plugin Command
 *
 * Lints plugin code using Biome (or ESLint).
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugins/cli.ts
 *
 * Dependencies:
 *   └─ @biomejs/biome (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import logger from "../../lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGINS_DIR = join(__dirname, "../../plugins/examples");

/**
 * Find plugin directory
 */
function findPluginDir(pluginId: string): string | null {
	// Try exact match first
	const exactPath = join(PLUGINS_DIR, pluginId);
	if (existsSync(exactPath)) {
		return exactPath;
	}

	// Try kebab-case version
	const kebabId = pluginId.replace(/\./g, "-");
	const kebabPath = join(PLUGINS_DIR, kebabId);
	if (existsSync(kebabPath)) {
		return kebabPath;
	}

	return null;
}

/**
 * Lint plugin code
 */
export async function lintPlugin(
	pluginId: string,
	fix: boolean = false,
): Promise<void> {
	logger.info({ pluginId, fix }, "Linting plugin code");

	// Find plugin directory
	const pluginDir = findPluginDir(pluginId);
	if (!pluginDir) {
		logger.error({ pluginId, searchDir: PLUGINS_DIR }, "Plugin not found");
		process.exit(1);
	}

	logger.info({ pluginDir }, "Plugin directory");

	// Check if src directory exists
	const srcDir = join(pluginDir, "src");
	if (!existsSync(srcDir)) {
		logger.error({ srcDir }, "Source directory not found");
		process.exit(1);
	}

	try {
		// Run Biome linter
		const command = fix
			? "bunx @biomejs/biome check --write"
			: "bunx @biomejs/biome check";

		logger.info("Running Biome linter...");
		execSync(command, {
			cwd: pluginDir,
			stdio: "inherit",
			env: {
				...process.env,
				// Only check src directory
				BIOME_CONFIG_PATH: undefined, // Use default or plugin-specific config
			},
		});

		if (fix) {
			logger.info("Code formatting completed");
		} else {
			logger.info("Linting completed");
		}
	} catch (error) {
		logger.error({ error }, "Linting failed");
		if (error instanceof Error) {
			logger.error({ message: error.message }, "Error details");
		}
		process.exit(1);
	}
}
