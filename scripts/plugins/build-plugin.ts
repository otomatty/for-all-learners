/**
 * Build Plugin Command
 *
 * Builds a plugin using esbuild, validates manifest, and performs type checking.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugins/cli.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-loader/manifest-validator.ts
 *   └─ esbuild (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
 * Read and validate manifest
 */
function readManifest(pluginDir: string): PluginManifest {
	const manifestPath = join(pluginDir, "plugin.json");
	if (!existsSync(manifestPath)) {
		throw new Error(`Manifest file not found: ${manifestPath}`);
	}

	const manifestContent = readFileSync(manifestPath, "utf-8");
	let manifest: PluginManifest;

	try {
		manifest = JSON.parse(manifestContent) as PluginManifest;
	} catch (error) {
		throw new Error(`Invalid JSON in manifest: ${error}`);
	}

	// Validate manifest
	const validation = validateManifest(manifest);
	if (!validation.valid) {
		logger.error({ errors: validation.errors }, "Manifest validation errors");
		throw new Error("Manifest validation failed");
	}

	if (validation.warnings.length > 0) {
		logger.warn(
			{ warnings: validation.warnings },
			"Manifest validation warnings",
		);
	}

	return manifest;
}

/**
 * Build plugin using esbuild
 */
async function buildWithEsbuild(
	pluginDir: string,
	manifest: PluginManifest,
): Promise<void> {
	const { build } = await import("esbuild");

	const entryPoint = join(pluginDir, manifest.main);
	if (!existsSync(entryPoint)) {
		throw new Error(`Entry point not found: ${entryPoint}`);
	}

	const distDir = join(pluginDir, "dist");
	if (!existsSync(distDir)) {
		mkdirSync(distDir, { recursive: true });
	}

	const outputFile = join(distDir, "index.js");

	logger.info(
		{ entry: manifest.main, output: "dist/index.js" },
		"Building plugin",
	);

	try {
		await build({
			entryPoints: [entryPoint],
			bundle: true,
			outfile: outputFile,
			format: "esm",
			platform: "browser",
			target: "es2020",
			sourcemap: true,
			minify: false, // Don't minify for development
			legalComments: "inline",
		});

		logger.info("Build completed successfully");

		// Update manifest main to point to dist
		const updatedManifest = {
			...manifest,
			main: "dist/index.js",
		};

		// Write updated manifest for production use
		const manifestOutputPath = join(distDir, "plugin.json");
		writeFileSync(
			manifestOutputPath,
			JSON.stringify(updatedManifest, null, 2),
			"utf-8",
		);
	} catch (error) {
		logger.error({ error }, "Build failed");
		throw error;
	}
}

/**
 * Type check plugin
 */
async function typeCheckPlugin(pluginDir: string): Promise<void> {
	logger.info("Type checking...");

	// Check if tsconfig.json exists
	const tsconfigPath = join(pluginDir, "tsconfig.json");
	if (!existsSync(tsconfigPath)) {
		logger.warn("tsconfig.json not found, skipping type check");
		return;
	}

	// Use TypeScript compiler API for type checking
	try {
		const { execSync } = await import("node:child_process");
		execSync("bunx tsc --noEmit", {
			cwd: pluginDir,
			stdio: "inherit",
		});
		logger.info("Type check passed");
	} catch (error) {
		logger.error({ error }, "Type check failed");
		throw error;
	}
}

/**
 * Build plugin
 */
export async function buildPlugin(pluginId: string): Promise<void> {
	logger.info({ pluginId }, "Building plugin");

	// Find plugin directory
	const pluginDir = findPluginDir(pluginId);
	if (!pluginDir) {
		logger.error({ pluginId, searchDir: PLUGINS_DIR }, "Plugin not found");
		process.exit(1);
	}

	logger.info({ pluginDir }, "Plugin directory");

	try {
		// Read and validate manifest
		const manifest = readManifest(pluginDir);
		logger.info(
			{
				name: manifest.name,
				version: manifest.version,
				id: manifest.id,
			},
			"Plugin info",
		);

		// Type check
		await typeCheckPlugin(pluginDir);

		// Build
		await buildWithEsbuild(pluginDir, manifest);

		logger.info(
			{ output: join(pluginDir, "dist") },
			"Plugin built successfully",
		);
	} catch (error) {
		logger.error({ error }, "Build failed");
		if (error instanceof Error) {
			logger.error({ message: error.message }, "Error details");
		}
		process.exit(1);
	}
}
