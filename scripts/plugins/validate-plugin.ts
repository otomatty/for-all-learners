/**
 * Validate Plugin Command
 *
 * Validates plugin manifest, type checks, and dependency checks.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugins/cli.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-loader/manifest-validator.ts
 *   └─ TypeScript compiler
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import logger from "../../lib/logger";
import { validateManifest } from "../../lib/plugins/plugin-loader/manifest-validator";
import type { PluginManifest } from "../../types/plugin";

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
 * Validate plugin manifest
 */
function validateManifestFile(pluginDir: string): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	const manifestPath = join(pluginDir, "plugin.json");
	if (!existsSync(manifestPath)) {
		return {
			valid: false,
			errors: [`Manifest file not found: ${manifestPath}`],
			warnings: [],
		};
	}

	try {
		const manifestContent = readFileSync(manifestPath, "utf-8");
		const manifest = JSON.parse(manifestContent) as PluginManifest;
		return validateManifest(manifest);
	} catch (error) {
		return {
			valid: false,
			errors: [`Invalid JSON in manifest: ${error}`],
			warnings: [],
		};
	}
}

/**
 * Type check plugin
 */
function typeCheckPlugin(pluginDir: string): {
	success: boolean;
	errors: string[];
} {
	try {
		const tsconfigPath = join(pluginDir, "tsconfig.json");
		if (!existsSync(tsconfigPath)) {
			return {
				success: false,
				errors: ["tsconfig.json not found"],
			};
		}

		// Run TypeScript compiler in check mode
		execSync("bunx tsc --noEmit", {
			cwd: pluginDir,
			stdio: "pipe",
		});

		return {
			success: true,
			errors: [],
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			errors: [errorMessage],
		};
	}
}

/**
 * Check dependencies
 */
function checkDependencies(pluginDir: string): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	const packageJsonPath = join(pluginDir, "package.json");
	if (!existsSync(packageJsonPath)) {
		return {
			valid: false,
			errors: ["package.json not found"],
			warnings: [],
		};
	}

	try {
		const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
		const packageJson = JSON.parse(packageJsonContent) as {
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
			peerDependencies?: Record<string, string>;
		};

		const errors: string[] = [];
		const warnings: string[] = [];

		// Check for forbidden dependencies
		const forbiddenDeps = ["@types/node", "typescript", "esbuild"]; // These should be in devDependencies only

		const _allDeps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
			...packageJson.peerDependencies,
		};

		for (const dep of forbiddenDeps) {
			if (packageJson.dependencies?.[dep]) {
				warnings.push(`${dep} should be in devDependencies, not dependencies`);
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	} catch (error) {
		return {
			valid: false,
			errors: [`Invalid package.json: ${error}`],
			warnings: [],
		};
	}
}

/**
 * Validate plugin
 */
export async function validatePlugin(pluginId: string): Promise<void> {
	logger.info({ pluginId }, "Validating plugin");

	// Find plugin directory
	const pluginDir = findPluginDir(pluginId);
	if (!pluginDir) {
		logger.error({ pluginId, searchDir: PLUGINS_DIR }, "Plugin not found");
		process.exit(1);
	}

	logger.info({ pluginDir }, "Plugin directory");

	// Validate manifest
	logger.info("Validating manifest...");
	const manifestResult = validateManifestFile(pluginDir);
	if (!manifestResult.valid) {
		logger.error(
			{ errors: manifestResult.errors },
			"Manifest validation failed",
		);
		process.exit(1);
	}
	if (manifestResult.warnings.length > 0) {
		logger.warn({ warnings: manifestResult.warnings }, "Manifest warnings");
	}
	logger.info("Manifest validation passed");

	// Type check
	logger.info("Type checking...");
	const typeCheckResult = typeCheckPlugin(pluginDir);
	if (!typeCheckResult.success) {
		logger.error({ errors: typeCheckResult.errors }, "Type checking failed");
		process.exit(1);
	}
	logger.info("Type checking passed");

	// Check dependencies
	logger.info("Checking dependencies...");
	const depsResult = checkDependencies(pluginDir);
	if (!depsResult.valid) {
		logger.error({ errors: depsResult.errors }, "Dependency check failed");
		process.exit(1);
	}
	if (depsResult.warnings.length > 0) {
		logger.warn({ warnings: depsResult.warnings }, "Dependency warnings");
	}
	logger.info("Dependency check passed");

	logger.info("Plugin validation completed successfully");
}
