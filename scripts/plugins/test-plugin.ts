/**
 * Test Plugin Command
 *
 * Runs plugin tests using Vitest.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugins/cli.ts
 *
 * Dependencies:
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

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
 * Run plugin tests
 */
export async function testPlugin(pluginId: string): Promise<void> {
	logger.info({ pluginId }, "Running tests for plugin");

	// Find plugin directory
	const pluginDir = findPluginDir(pluginId);
	if (!pluginDir) {
		logger.error({ pluginId, searchDir: PLUGINS_DIR }, "Plugin not found");
		process.exit(1);
	}

	// Check if test directory exists
	const testDir = join(pluginDir, "__tests__");
	if (!existsSync(testDir)) {
		logger.warn({ testDir }, "No tests found");
		logger.info("Create tests in __tests__ directory to run tests");
		process.exit(0);
	}

	// Check if vitest is installed
	try {
		const { execSync } = await import("node:child_process");

		logger.info({ pluginDir }, "Plugin directory");

		// Run vitest
		logger.info("Running tests with Vitest...");
		execSync("bunx vitest run", {
			cwd: pluginDir,
			stdio: "inherit",
		});

		logger.info("Tests completed");
	} catch (error) {
		logger.error({ error }, "Test execution failed");
		if (error instanceof Error) {
			logger.error({ message: error.message }, "Error details");
		}
		process.exit(1);
	}
}
