/**
 * Plugin Execution Monitor
 *
 * Monitors plugin execution time and enforces CPU usage limits.
 * Automatically terminates plugins that exceed execution time limits.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-loader/plugin-loader.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/types.ts
 *   └─ lib/logger.ts
 *
 * Related Documentation:
 *   └─ Issue #96: Plugin System Security Enhancement
 */

import logger from "@/lib/logger";
import { getPluginSecurityAuditLogger } from "./plugin-security-audit-logger";

/**
 * Plugin execution state
 */
interface PluginExecutionState {
	pluginId: string;
	startTime: number;
	lastActivityTime: number;
	timeoutId: NodeJS.Timeout | null;
	worker: Worker;
}

/**
 * Configuration for execution monitoring
 */
interface ExecutionMonitorConfig {
	/** Maximum execution time in milliseconds (default: 5 minutes) */
	maxExecutionTime: number;
	/** Maximum idle time before warning (default: 1 minute) */
	maxIdleTime: number;
	/** Check interval for monitoring (default: 30 seconds) */
	checkInterval: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ExecutionMonitorConfig = {
	maxExecutionTime: 5 * 60 * 1000, // 5 minutes
	maxIdleTime: 60 * 1000, // 1 minute
	checkInterval: 30 * 1000, // 30 seconds
};

/**
 * Plugin Execution Monitor
 *
 * Monitors plugin execution and terminates plugins that exceed limits.
 */
class PluginExecutionMonitor {
	private static instance: PluginExecutionMonitor | null = null;
	private executions: Map<string, PluginExecutionState> = new Map();
	private checkIntervalId: NodeJS.Timeout | null = null;
	private config: ExecutionMonitorConfig = DEFAULT_CONFIG;

	private constructor() {
		// Start monitoring loop
		this.startMonitoringLoop();
	}

	public static getInstance(): PluginExecutionMonitor {
		if (!PluginExecutionMonitor.instance) {
			PluginExecutionMonitor.instance = new PluginExecutionMonitor();
		}
		return PluginExecutionMonitor.instance;
	}

	/**
	 * Start monitoring a plugin execution
	 *
	 * @param pluginId Plugin ID
	 * @param worker Worker instance
	 */
	public startMonitoring(pluginId: string, worker: Worker): void {
		const now = Date.now();

		// Clear existing monitoring if any
		this.stopMonitoring(pluginId);

		const state: PluginExecutionState = {
			pluginId,
			startTime: now,
			lastActivityTime: now,
			timeoutId: null,
			worker,
		};

		// Set timeout for maximum execution time
		state.timeoutId = setTimeout(() => {
			this.terminatePlugin(pluginId, "Maximum execution time exceeded");
		}, this.config.maxExecutionTime);

		this.executions.set(pluginId, state);

		logger.debug({ pluginId }, "Plugin execution monitoring started");
	}

	/**
	 * Update last activity time for a plugin
	 *
	 * @param pluginId Plugin ID
	 */
	public updateActivity(pluginId: string): void {
		const state = this.executions.get(pluginId);
		if (state) {
			state.lastActivityTime = Date.now();
		}
	}

	/**
	 * Stop monitoring a plugin execution
	 *
	 * @param pluginId Plugin ID
	 */
	public stopMonitoring(pluginId: string): void {
		const state = this.executions.get(pluginId);
		if (state) {
			if (state.timeoutId) {
				clearTimeout(state.timeoutId);
			}
			this.executions.delete(pluginId);
			logger.debug({ pluginId }, "Plugin execution monitoring stopped");
		}
	}

	/**
	 * Terminate plugin due to execution limit
	 *
	 * @param pluginId Plugin ID
	 * @param reason Reason for termination
	 */
	private terminatePlugin(pluginId: string, reason: string): void {
		const state = this.executions.get(pluginId);
		if (!state) {
			return;
		}

		const executionTime = Date.now() - state.startTime;

		// Log plugin termination to security audit log
		const auditLogger = getPluginSecurityAuditLogger();
		auditLogger.logPluginTerminated(pluginId, reason, executionTime);

		// Log execution timeout if applicable
		if (
			reason.includes("timeout") ||
			reason.includes("Maximum execution time")
		) {
			auditLogger.logExecutionTimeout(
				pluginId,
				executionTime,
				this.config.maxExecutionTime,
				reason,
			);
		}

		logger.warn(
			{
				pluginId,
				reason,
				executionTime,
			},
			"Terminating plugin due to execution limit",
		);

		// Terminate worker
		try {
			state.worker.terminate();
		} catch (error) {
			logger.error({ error, pluginId }, "Failed to terminate plugin worker");
		}

		// Stop monitoring
		this.stopMonitoring(pluginId);
	}

	/**
	 * Start monitoring loop
	 */
	private startMonitoringLoop(): void {
		this.checkIntervalId = setInterval(() => {
			this.checkExecutions();
		}, this.config.checkInterval);
	}

	/**
	 * Check all plugin executions
	 */
	private checkExecutions(): void {
		const now = Date.now();

		for (const [pluginId, state] of this.executions.entries()) {
			// Check for idle plugins
			const idleTime = now - state.lastActivityTime;
			if (idleTime > this.config.maxIdleTime) {
				logger.warn(
					{
						pluginId,
						idleTime,
						maxIdleTime: this.config.maxIdleTime,
					},
					"Plugin has been idle for extended period",
				);
			}

			// Check for execution time
			const executionTime = now - state.startTime;
			if (executionTime > this.config.maxExecutionTime) {
				this.terminatePlugin(pluginId, "Maximum execution time exceeded");
			}
		}
	}

	/**
	 * Get execution stats for a plugin
	 *
	 * @param pluginId Plugin ID
	 * @returns Execution stats or null if not monitored
	 */
	public getExecutionStats(pluginId: string): {
		executionTime: number;
		idleTime: number;
	} | null {
		const state = this.executions.get(pluginId);
		if (!state) {
			return null;
		}

		const now = Date.now();
		return {
			executionTime: now - state.startTime,
			idleTime: now - state.lastActivityTime,
		};
	}

	/**
	 * Reset monitor (for testing)
	 */
	public reset(): void {
		for (const [pluginId] of this.executions.entries()) {
			this.stopMonitoring(pluginId);
		}
		if (this.checkIntervalId) {
			clearInterval(this.checkIntervalId);
			this.checkIntervalId = null;
		}
		// Restart monitoring loop
		this.startMonitoringLoop();
	}
}

/**
 * Get singleton instance
 */
export function getPluginExecutionMonitor(): PluginExecutionMonitor {
	return PluginExecutionMonitor.getInstance();
}
