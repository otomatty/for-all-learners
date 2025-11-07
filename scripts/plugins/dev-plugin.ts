/**
 * Dev Plugin Command
 *
 * Starts development mode with watch mode building and hot reload.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugins/cli.ts
 *
 * Dependencies:
 *   ├─ scripts/plugins/build-plugin.ts
 *   └─ esbuild (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { existsSync, readFileSync } from "node:fs";
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

	return null;
}

/**
 * Read manifest
 */
function readManifest(pluginDir: string): PluginManifest {
	const manifestPath = join(pluginDir, "plugin.json");
	if (!existsSync(manifestPath)) {
		throw new Error(`Manifest file not found: ${manifestPath}`);
	}

	const manifestContent = readFileSync(manifestPath, "utf-8");
	return JSON.parse(manifestContent) as PluginManifest;
}

/**
 * Start development mode
 */
export async function devPlugin(pluginId: string): Promise<void> {
	logger.info({ pluginId }, "Starting development mode for plugin");

	// Find plugin directory
	const pluginDir = findPluginDir(pluginId);
	if (!pluginDir) {
		logger.error({ pluginId, searchDir: PLUGINS_DIR }, "Plugin not found");
		process.exit(1);
	}

	// Read manifest
	const manifest = readManifest(pluginDir);
	const validation = validateManifest(manifest);
	if (!validation.valid) {
		logger.error({ errors: validation.errors }, "Manifest validation errors");
		process.exit(1);
	}

	logger.info(
		{
			name: manifest.name,
			version: manifest.version,
			pluginDir,
		},
		"Plugin info",
	);

	// Start watch mode build
	const esbuild = await import("esbuild");

	const entryPoint = join(pluginDir, manifest.main);
	if (!existsSync(entryPoint)) {
		logger.error({ entryPoint }, "Entry point not found");
		process.exit(1);
	}

	const distDir = join(pluginDir, "dist");
	const outputFile = join(distDir, "index.js");

	logger.info(
		{
			entry: manifest.main,
			output: "dist/index.js",
		},
		"Starting watch mode build",
	);
	logger.info("Press Ctrl+C to stop");

	// Build context for watch mode
	// Note: When watch option is provided, build() returns BuildContext instead of BuildResult
	// Type assertion needed due to esbuild type definitions not properly handling watch option
	const buildOptions = {
		entryPoints: [entryPoint],
		bundle: true,
		outfile: outputFile,
		format: "esm" as const,
		platform: "browser" as const,
		target: "es2020",
		sourcemap: true,
		minify: false,
		legalComments: "inline" as const,
		watch: {
			onRebuild(error: unknown) {
				if (error) {
					logger.error({ error }, "Rebuild failed");
				} else {
					logger.info("Rebuild completed");
				}
			},
		},
	};

	// Type assertion: esbuild type definitions don't properly handle watch option
	// When watch is provided, build() returns BuildContext with dispose method
	const ctx = (await esbuild.build(
		buildOptions as Parameters<typeof esbuild.build>[0],
	)) as Awaited<ReturnType<typeof esbuild.build>> & {
		dispose: () => Promise<void>;
	};

	logger.info("Initial build completed");
	logger.info("Watching for changes...");

	// Keep process alive
	process.on("SIGINT", async () => {
		logger.info("Stopping watch mode...");
		await ctx.dispose();
		process.exit(0);
	});
}
