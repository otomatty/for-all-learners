/**
 * Plugin Debug Tools
 *
 * Provides debugging utilities for plugin development:
 * - Plugin execution log collection
 * - Error tracking
 * - Performance measurement
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ app/(protected)/settings/plugins/dev/debug/page.tsx
 *   └─ lib/plugins/plugin-loader/plugin-loader.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-registry.ts
 *   ├─ lib/plugins/plugin-execution-monitor.ts
 *   └─ lib/logger.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import logger from "@/lib/logger";
import type { LoadedPlugin } from "@/types/plugin";
import { getPluginExecutionMonitor } from "./plugin-execution-monitor";
import { getPluginRegistry } from "./plugin-registry";

/**
 * Plugin log entry
 */
export interface PluginLogEntry {
	/** Timestamp */
	timestamp: Date;

	/** Log level */
	level: "info" | "warn" | "error" | "debug";

	/** Log message */
	message: string;

	/** Additional data */
	data?: Record<string, unknown>;
}

/**
 * Plugin error entry
 */
export interface PluginErrorEntry {
	/** Timestamp */
	timestamp: Date;

	/** Error message */
	message: string;

	/** Error stack trace */
	stack?: string;

	/** Plugin ID */
	pluginId: string;

	/** Plugin name */
	pluginName: string;
}

/**
 * Plugin performance metrics
 */
export interface PluginPerformanceMetrics {
	/** Plugin ID */
	pluginId: string;

	/** Plugin name */
	pluginName: string;

	/** Load time in milliseconds */
	loadTime: number;

	/** Total execution time in milliseconds */
	totalExecutionTime: number;

	/** Last activity time */
	lastActivityTime: Date;

	/** API call count */
	apiCallCount: number;

	/** Error count */
	errorCount: number;
}

/**
 * Plugin debug information
 */
export interface PluginDebugInfo {
	/** Plugin information */
	plugin: LoadedPlugin;

	/** Performance metrics */
	metrics: PluginPerformanceMetrics;

	/** Recent logs */
	logs: PluginLogEntry[];

	/** Recent errors */
	errors: PluginErrorEntry[];
}

/**
 * In-memory log storage (for development)
 */
class PluginDebugLogger {
	private logs: Map<string, PluginLogEntry[]> = new Map();
	private errors: Map<string, PluginErrorEntry[]> = new Map();
	private maxLogsPerPlugin = 1000;
	private maxErrorsPerPlugin = 100;

	/**
	 * Add log entry for a plugin
	 */
	public addLog(
		pluginId: string,
		level: PluginLogEntry["level"],
		message: string,
		data?: Record<string, unknown>,
	): void {
		const pluginLogs = this.logs.get(pluginId) ?? [];
		pluginLogs.push({
			timestamp: new Date(),
			level,
			message,
			data,
		});

		// Keep only recent logs
		if (pluginLogs.length > this.maxLogsPerPlugin) {
			pluginLogs.shift();
		}

		this.logs.set(pluginId, pluginLogs);
	}

	/**
	 * Add error entry for a plugin
	 */
	public addError(
		pluginId: string,
		message: string,
		stack?: string,
		pluginName?: string,
	): void {
		const pluginErrors = this.errors.get(pluginId) ?? [];
		pluginErrors.push({
			timestamp: new Date(),
			message,
			stack,
			pluginId,
			pluginName: pluginName || pluginId,
		});

		// Keep only recent errors
		if (pluginErrors.length > this.maxErrorsPerPlugin) {
			pluginErrors.shift();
		}

		this.errors.set(pluginId, pluginErrors);
	}

	/**
	 * Get logs for a plugin
	 */
	public getLogs(pluginId: string, limit = 100): PluginLogEntry[] {
		const logs = this.logs.get(pluginId) ?? [];
		return logs.slice(-limit);
	}

	/**
	 * Get errors for a plugin
	 */
	public getErrors(pluginId: string, limit = 50): PluginErrorEntry[] {
		const errors = this.errors.get(pluginId) ?? [];
		return errors.slice(-limit);
	}

	/**
	 * Clear logs for a plugin
	 */
	public clearLogs(pluginId: string): void {
		this.logs.delete(pluginId);
	}

	/**
	 * Clear errors for a plugin
	 */
	public clearErrors(pluginId: string): void {
		this.errors.delete(pluginId);
	}

	/**
	 * Clear all logs and errors
	 */
	public clearAll(): void {
		this.logs.clear();
		this.errors.clear();
	}
}

// Singleton instance
const debugLogger = new PluginDebugLogger();

/**
 * Get plugin debug information
 *
 * @param pluginId Plugin ID
 * @returns Debug information or null if plugin not found
 */
export function getPluginDebugInfo(pluginId: string): PluginDebugInfo | null {
	const registry = getPluginRegistry();
	const plugin = registry.get(pluginId);

	if (!plugin) {
		return null;
	}

	// Get performance metrics
	const _executionMonitor = getPluginExecutionMonitor();
	const metrics: PluginPerformanceMetrics = {
		pluginId: plugin.manifest.id,
		pluginName: plugin.manifest.name,
		loadTime: Date.now() - plugin.loadedAt.getTime(),
		totalExecutionTime: Date.now() - plugin.loadedAt.getTime(), // TODO: Get actual execution time
		lastActivityTime: new Date(), // TODO: Get actual last activity time
		apiCallCount: 0, // TODO: Track API calls
		errorCount: debugLogger.getErrors(pluginId).length,
	};

	// Get logs
	const logs = debugLogger.getLogs(pluginId);

	// Get errors
	const errors = debugLogger.getErrors(pluginId);

	return {
		plugin,
		metrics,
		logs,
		errors,
	};
}

/**
 * Get all loaded plugins debug information
 *
 * @returns Array of debug information for all loaded plugins
 */
export function getAllPluginsDebugInfo(): PluginDebugInfo[] {
	const registry = getPluginRegistry();
	const plugins = registry.getAll();

	return plugins
		.map((plugin) => getPluginDebugInfo(plugin.manifest.id))
		.filter((info): info is PluginDebugInfo => info !== null);
}

/**
 * Log plugin message
 *
 * @param pluginId Plugin ID
 * @param level Log level
 * @param message Log message
 * @param data Additional data
 */
export function logPluginMessage(
	pluginId: string,
	level: PluginLogEntry["level"],
	message: string,
	data?: Record<string, unknown>,
): void {
	debugLogger.addLog(pluginId, level, message, data);

	// Also log to main logger
	const logMethod =
		level === "error"
			? logger.error
			: level === "warn"
				? logger.warn
				: level === "debug"
					? logger.debug
					: logger.info;

	logMethod({ pluginId, ...data }, `[Plugin ${pluginId}] ${message}`);
}

/**
 * Log plugin error
 *
 * @param pluginId Plugin ID
 * @param message Error message
 * @param stack Error stack trace
 * @param pluginName Plugin name (optional)
 */
export function logPluginError(
	pluginId: string,
	message: string,
	stack?: string,
	pluginName?: string,
): void {
	debugLogger.addError(pluginId, message, stack, pluginName);
	logger.error(
		{ pluginId, pluginName, stack },
		`[Plugin ${pluginId}] Error: ${message}`,
	);
}

/**
 * Clear plugin logs
 *
 * @param pluginId Plugin ID (optional, clears all if not provided)
 */
export function clearPluginLogs(pluginId?: string): void {
	if (pluginId) {
		debugLogger.clearLogs(pluginId);
	} else {
		debugLogger.clearAll();
	}
}

/**
 * Clear plugin errors
 *
 * @param pluginId Plugin ID (optional, clears all if not provided)
 */
export function clearPluginErrors(pluginId?: string): void {
	if (pluginId) {
		debugLogger.clearErrors(pluginId);
	} else {
		debugLogger.clearAll();
	}
}

/**
 * Get plugin logs
 *
 * @param pluginId Plugin ID
 * @param limit Maximum number of logs to return
 * @returns Array of log entries
 */
export function getPluginLogs(pluginId: string, limit = 100): PluginLogEntry[] {
	return debugLogger.getLogs(pluginId, limit);
}

/**
 * Get plugin errors
 *
 * @param pluginId Plugin ID
 * @param limit Maximum number of errors to return
 * @returns Array of error entries
 */
export function getPluginErrors(
	pluginId: string,
	limit = 50,
): PluginErrorEntry[] {
	return debugLogger.getErrors(pluginId, limit);
}
