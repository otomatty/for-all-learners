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
import { createClient } from "@/lib/supabase/client";
import type { LoadedPlugin } from "@/types/plugin";
import { getCalendarExtensions } from "./calendar-registry";
import { getRegisteredCommands } from "./plugin-api";
import { getPluginExecutionMonitor } from "./plugin-execution-monitor";
import { getPluginRegistry } from "./plugin-registry";
import { getWidgets } from "./ui-registry";

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
 * Registry state information
 */
export interface PluginRegistryState {
	/** Calendar extensions registered by this plugin */
	calendarExtensions: Array<{
		extensionId: string;
		name: string;
		description?: string;
	}>;

	/** Widgets registered by this plugin */
	widgets: Array<{
		widgetId: string;
		name: string;
		description?: string;
		position: string;
		size: string;
		icon?: string;
	}>;

	/** Commands registered by this plugin */
	commands: Array<{
		commandId: string;
		name: string;
		description?: string;
		icon?: string;
	}>;
}

/**
 * Plugin configuration information
 */
export interface PluginConfigInfo {
	/** Configuration keys */
	keys: string[];

	/** Configuration values (sanitized for sensitive data) */
	config: Record<string, unknown>;

	/** Has GitHub token */
	hasGitHubToken: boolean;
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

	/** Registry state */
	registryState: PluginRegistryState;

	/** Configuration information */
	configInfo: PluginConfigInfo | null;
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
 * Get registry state for a plugin
 *
 * @param pluginId Plugin ID
 * @returns Registry state
 */
export function getPluginRegistryState(pluginId: string): PluginRegistryState {
	// Get calendar extensions
	const calendarExts = getCalendarExtensions(pluginId);
	const calendarExtensions = calendarExts.map((ext) => ({
		extensionId: ext.extensionId,
		name: ext.name,
		description: ext.description,
	}));

	// Get widgets
	const widgets = getWidgets(pluginId);
	const widgetList = widgets.map((widget) => ({
		widgetId: widget.widgetId,
		name: widget.name,
		description: widget.description,
		position: widget.position,
		size: widget.size,
		icon: widget.icon,
	}));

	// Get commands
	const allCommands = getRegisteredCommands();
	const commands: Array<{
		commandId: string;
		name: string;
		description?: string;
		icon?: string;
	}> = [];

	for (const [commandId, command] of allCommands.entries()) {
		// Check if command belongs to this plugin
		if (commandId.startsWith(`${pluginId}.`)) {
			commands.push({
				commandId: command.id,
				name: command.label || command.id,
				description: command.description,
				icon: command.icon,
			});
		}
	}

	return {
		calendarExtensions,
		widgets: widgetList,
		commands,
	};
}

/**
 * Get plugin configuration information
 *
 * @param pluginId Plugin ID
 * @returns Configuration information or null if error
 */
async function getAllPluginStorage(
	pluginId: string,
): Promise<Record<string, unknown>> {
	const supabase = createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error("User not authenticated");
	}

	const { data, error } = await supabase
		.from("plugin_storage")
		.select("key, value")
		.eq("user_id", user.id)
		.eq("plugin_id", pluginId);

	if (error) {
		throw error;
	}

	const config: Record<string, unknown> = {};
	for (const item of data || []) {
		config[item.key] = item.value;
	}

	return config;
}

export async function getPluginConfigInfo(
	pluginId: string,
): Promise<PluginConfigInfo | null> {
	try {
		const config = await getAllPluginStorage(pluginId);
		const keys = Object.keys(config);

		// Sanitize sensitive data
		const sanitizedConfig: Record<string, unknown> = {};
		let hasGitHubToken = false;

		for (const [key, value] of Object.entries(config)) {
			// Check if this is a sensitive field
			const isSensitive =
				key.toLowerCase().includes("token") ||
				key.toLowerCase().includes("password") ||
				key.toLowerCase().includes("secret") ||
				key.toLowerCase().includes("key") ||
				key.toLowerCase().includes("oauth");

			if (isSensitive) {
				if (key.toLowerCase().includes("github")) {
					hasGitHubToken = true;
				}
				sanitizedConfig[key] = value
					? `***${String(value).slice(-4)}`
					: undefined;
			} else {
				sanitizedConfig[key] = value;
			}
		}

		return {
			keys,
			config: sanitizedConfig,
			hasGitHubToken,
		};
	} catch (error) {
		logger.error({ error, pluginId }, "Failed to get plugin config info");
		return null;
	}
}

/**
 * Get plugin debug information
 *
 * @param pluginId Plugin ID
 * @returns Debug information or null if plugin not found
 */
export async function getPluginDebugInfo(
	pluginId: string,
): Promise<PluginDebugInfo | null> {
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

	// Get registry state
	const registryState = getPluginRegistryState(pluginId);

	// Get configuration info
	const configInfo = await getPluginConfigInfo(pluginId);

	return {
		plugin,
		metrics,
		logs,
		errors,
		registryState,
		configInfo,
	};
}

/**
 * Get all loaded plugins debug information
 *
 * @returns Array of debug information for all loaded plugins
 */
export async function getAllPluginsDebugInfo(): Promise<PluginDebugInfo[]> {
	const registry = getPluginRegistry();
	const plugins = registry.getAll();

	const results = await Promise.all(
		plugins.map((plugin) => getPluginDebugInfo(plugin.manifest.id)),
	);

	return results.filter((info): info is PluginDebugInfo => info !== null);
}

/**
 * Safely serialize a value for logging, removing null/undefined values
 * that could cause Object.getPrototypeOf errors in Pino
 */
function sanitizeLogValue(value: unknown): unknown {
	if (value === null || value === undefined) {
		return undefined; // Will be filtered out
	}

	// Primitive types are safe
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		typeof value === "bigint" ||
		typeof value === "symbol"
	) {
		return value;
	}

	// Handle Date objects
	if (value instanceof Date) {
		return value.toISOString();
	}

	// Handle Error objects
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			stack: value.stack,
		};
	}

	// Handle arrays
	if (Array.isArray(value)) {
		return value.map(sanitizeLogValue).filter((v) => v !== undefined);
	}

	// Handle objects (but not null, which is typeof "object" but not an actual object)
	if (typeof value === "object" && value !== null) {
		try {
			// Check if value is a plain object (not an instance of a class)
			// Objects created with Object.create(null) have null prototype, which is safe
			// But we need to ensure Object.entries works
			if (Object.prototype.toString.call(value) !== "[object Object]") {
				// Not a plain object, convert to string
				return String(value);
			}

			const sanitized: Record<string, unknown> = {};
			// Object.entries can throw if value is not an object or has issues
			// Use Object.keys to be safer
			const keys = Object.keys(value);
			for (const key of keys) {
				// Skip null and undefined keys
				if (key === null || key === undefined) {
					continue;
				}
				try {
					const val = (value as Record<string, unknown>)[key];
					const sanitizedVal = sanitizeLogValue(val);
					if (sanitizedVal !== undefined) {
						sanitized[key] = sanitizedVal;
					}
				} catch {}
			}
			return sanitized;
		} catch {
			// If processing fails, convert to string
			return String(value);
		}
	}

	// Fallback: convert to string
	return String(value);
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

	// Safely construct log data, filtering out null/undefined values
	// Pino logger may call Object.getPrototypeOf on values, which fails for null/undefined
	const logData: Record<string, unknown> = {};
	if (pluginId !== null && pluginId !== undefined) {
		logData.pluginId = pluginId;
	}
	if (
		data !== null &&
		data !== undefined &&
		typeof data === "object" &&
		!Array.isArray(data)
	) {
		try {
			const keys = Object.keys(data);
			for (const key of keys) {
				// Skip null and undefined keys
				if (key === null || key === undefined) {
					continue;
				}
				try {
					const value = data[key];
					// Sanitize value to remove null/undefined and problematic objects
					const sanitized = sanitizeLogValue(value);
					if (sanitized !== undefined) {
						logData[key] = sanitized;
					}
				} catch {}
			}
		} catch {
			// If Object.keys fails, skip data processing
			// logData will only contain pluginId
		}
	}

	// Use direct logger method calls instead of storing method reference
	// This avoids potential issues with 'this' context binding
	try {
		const logMessage = `[Plugin ${pluginId}] ${message}`;

		// Ensure logData is a plain object with no problematic values
		// Use regular object literal (not Object.create(null)) to ensure proper prototype chain
		const safeLogData: Record<string, unknown> = {};
		const keys = Object.keys(logData);
		for (const key of keys) {
			try {
				const value = logData[key];
				// Final sanitization pass - ensure value is safe
				if (value === null || value === undefined) {
					continue; // Skip null/undefined values
				}
				const sanitized = sanitizeLogValue(value);
				if (sanitized !== undefined) {
					// Only add primitive types or plain objects
					const valueType = typeof sanitized;
					if (
						valueType === "string" ||
						valueType === "number" ||
						valueType === "boolean" ||
						(valueType === "object" &&
							sanitized !== null &&
							Object.prototype.toString.call(sanitized) === "[object Object]")
					) {
						safeLogData[key] = sanitized;
					}
				}
			} catch {}
		}

		// Call logger method directly based on level
		switch (level) {
			case "error":
				logger.error(safeLogData, logMessage);
				break;
			case "warn":
				logger.warn(safeLogData, logMessage);
				break;
			case "debug":
				logger.debug(safeLogData, logMessage);
				break;
			default:
				logger.info(safeLogData, logMessage);
				break;
		}
	} catch (error) {
		// Fallback: log with minimal data if serialization fails
		// Use try-catch to prevent infinite error loops
		try {
			logger.error(
				{
					pluginId: String(pluginId || "unknown"),
					errorMessage: error instanceof Error ? error.message : String(error),
					originalMessage: String(message || ""),
				},
				"Failed to log plugin message",
			);
		} catch {
			// If even fallback logging fails, silently ignore to prevent infinite loops
			// This is a last resort - we've already logged to debugLogger above
		}
	}
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
