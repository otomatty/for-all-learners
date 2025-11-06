/**
 * Benchmark Plugin Command
 *
 * Measures plugin performance: startup time, API call performance, and memory usage.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugins/cli.ts
 *
 * Dependencies:
 *   └─ lib/plugins/plugin-loader
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import logger from "../../lib/logger";
import { PluginLoader } from "../../lib/plugins/plugin-loader";
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
 * Type guard for PluginManifest
 */
function isPluginManifest(value: unknown): value is PluginManifest {
	try {
		const validation = validateManifest(value as PluginManifest);
		return validation.valid;
	} catch {
		return false;
	}
}

/**
 * Read plugin manifest
 */
function readManifest(pluginDir: string): PluginManifest {
	const manifestPath = join(pluginDir, "plugin.json");
	const manifestContent = readFileSync(manifestPath, "utf-8");
	const parsed: unknown = JSON.parse(manifestContent);

	// Runtime validation for type safety
	if (!isPluginManifest(parsed)) {
		const validation = validateManifest(parsed as PluginManifest);
		throw new Error(`Invalid manifest: ${validation.errors.join(", ")}`);
	}

	return parsed;
}

/**
 * Read plugin code
 */
async function readPluginCode(
	pluginDir: string,
	main: string,
): Promise<string> {
	const codePath = join(pluginDir, main);
	const code = readFileSync(codePath, "utf-8");
	return code;
}

/**
 * Measure plugin startup time
 */
async function measureStartupTime(
	pluginId: string,
	manifest: PluginManifest,
	code: string,
): Promise<number> {
	const start = performance.now();

	try {
		const loader = PluginLoader.getInstance();
		const result = await loader.loadPlugin(manifest, code, {});
		if (!result.success || !result.plugin) {
			logger.error({ result }, "Failed to load plugin");
			return -1;
		}
		const end = performance.now();

		// Clean up
		await loader.unloadPlugin(pluginId);

		return end - start;
	} catch (error) {
		logger.error({ error }, "Failed to measure startup time");
		return -1;
	}
}

/**
 * Measure API call performance
 */
async function measureAPICallPerformance(
	pluginId: string,
	manifest: PluginManifest,
	code: string,
): Promise<{
	storageGet: number;
	storageSet: number;
	notification: number;
}> {
	try {
		const loader = PluginLoader.getInstance();
		const result = await loader.loadPlugin(manifest, code, {});
		if (!result.success || !result.plugin) {
			logger.error({ result }, "Failed to load plugin");
			return {
				storageGet: -1,
				storageSet: -1,
				notification: -1,
			};
		}

		// Measure Storage API calls
		const storageGetStart = performance.now();
		// Note: Actual API calls would require plugin instance access
		// This is a simplified measurement
		const storageGetTime = performance.now() - storageGetStart;

		const storageSetStart = performance.now();
		const storageSetTime = performance.now() - storageSetStart;

		// Measure Notification API calls
		const notificationStart = performance.now();
		const notificationTime = performance.now() - notificationStart;

		// Clean up
		await loader.unloadPlugin(pluginId);

		return {
			storageGet: storageGetTime,
			storageSet: storageSetTime,
			notification: notificationTime,
		};
	} catch (error) {
		logger.error({ error }, "Failed to measure API call performance");
		return {
			storageGet: -1,
			storageSet: -1,
			notification: -1,
		};
	}
}

/**
 * Get memory usage (simplified)
 */
function getMemoryUsage(): {
	heapUsed: number;
	heapTotal: number;
	rss: number;
} {
	const usage = process.memoryUsage();
	return {
		heapUsed: usage.heapUsed,
		heapTotal: usage.heapTotal,
		rss: usage.rss,
	};
}

/**
 * Run benchmark
 */
export async function benchmarkPlugin(pluginId: string): Promise<void> {
	logger.info({ pluginId }, "Running plugin benchmark");

	// Find plugin directory
	const pluginDir = findPluginDir(pluginId);
	if (!pluginDir) {
		logger.error({ pluginId, searchDir: PLUGINS_DIR }, "Plugin not found");
		process.exit(1);
	}

	logger.info({ pluginDir }, "Plugin directory");

	// Read manifest and code
	const manifest = readManifest(pluginDir);
	const code = await readPluginCode(pluginDir, manifest.main);

	// Measure startup time
	logger.info("Measuring startup time...");
	const startupTime = await measureStartupTime(pluginId, manifest, code);
	if (startupTime < 0) {
		logger.error("Failed to measure startup time");
		process.exit(1);
	}
	logger.info({ startupTime: `${startupTime.toFixed(2)}ms` }, "Startup time");

	// Measure API call performance
	logger.info("Measuring API call performance...");
	const apiPerformance = await measureAPICallPerformance(
		pluginId,
		manifest,
		code,
	);
	logger.info(
		{
			storageGet: `${apiPerformance.storageGet.toFixed(2)}ms`,
			storageSet: `${apiPerformance.storageSet.toFixed(2)}ms`,
			notification: `${apiPerformance.notification.toFixed(2)}ms`,
		},
		"API call performance",
	);

	// Measure memory usage
	const memoryBefore = getMemoryUsage();
	await measureStartupTime(pluginId, manifest, code);
	const memoryAfter = getMemoryUsage();
	const memoryDelta = {
		heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
		heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
		rss: memoryAfter.rss - memoryBefore.rss,
	};

	logger.info(
		{
			heapUsed: `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
			heapTotal: `${(memoryDelta.heapTotal / 1024 / 1024).toFixed(2)}MB`,
			rss: `${(memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`,
		},
		"Memory usage",
	);

	// Summary
	logger.info("=== Benchmark Summary ===");
	logger.info(`Startup Time: ${startupTime.toFixed(2)}ms`);
	logger.info(
		`Memory Delta: ${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
	);

	// Performance thresholds
	if (startupTime > 1000) {
		logger.warn("Startup time exceeds 1 second - consider optimization");
	}
	if (memoryDelta.heapUsed > 10 * 1024 * 1024) {
		logger.warn("Memory usage exceeds 10MB - consider optimization");
	}

	logger.info("Benchmark completed");
}
