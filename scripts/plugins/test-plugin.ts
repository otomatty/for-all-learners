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
 *
 * @param pluginId Plugin ID
 * @param args Additional arguments (e.g., --coverage)
 */
export async function testPlugin(
	pluginId: string,
	args: string[] = [],
): Promise<void> {
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

		// Check for coverage flag
		const coverage = args.includes("--coverage") || args.includes("-c");
		const testCommand = coverage
			? "bunx vitest run --coverage"
			: "bunx vitest run";

		// Run vitest
		logger.info("Running tests with Vitest...");
		if (coverage) {
			logger.info("Coverage report will be generated");
		}
		execSync(testCommand, {
			cwd: pluginDir,
			stdio: "inherit",
		});

		logger.info("Tests completed");
		if (coverage) {
			logger.info("Coverage report generated in coverage/ directory");
		}
	} catch (error) {
		logger.error({ error }, "Test execution failed");
		if (error instanceof Error) {
			logger.error({ message: error.message }, "Error details");
		}
		process.exit(1);
	}
}
