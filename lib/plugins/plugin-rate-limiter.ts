/**
 * Plugin Rate Limiter
 *
 * Manages rate limiting for plugin API calls and resource usage.
 * Prevents resource exhaustion attacks and ensures fair usage.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-loader/worker-message-handler.ts
 *
 * Dependencies:
 *   └─ lib/logger.ts
 *
 * Related Documentation:
 *   └─ Issue #96: Plugin System Security Enhancement
 */

import logger from "@/lib/logger";

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
	/** Maximum API calls per minute per plugin */
	maxCallsPerMinute: number;
	/** Maximum API calls per hour per plugin */
	maxCallsPerHour: number;
	/** Maximum storage size in bytes per plugin */
	maxStorageBytes: number;
	/** Maximum concurrent API calls per plugin */
	maxConcurrentCalls: number;
}

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
	maxCallsPerMinute: 60, // 1 call per second average
	maxCallsPerHour: 3600, // 60 calls per minute average
	maxStorageBytes: 10 * 1024 * 1024, // 10MB per plugin
	maxConcurrentCalls: 10, // Maximum 10 concurrent API calls
};

/**
 * Rate limit state for a plugin
 */
interface PluginRateLimitState {
	pluginId: string;
	userId: string;
	/** API call timestamps (for rate limiting) */
	callTimestamps: number[];
	/** Current concurrent API calls */
	concurrentCalls: number;
	/** Storage size in bytes */
	storageBytes: number;
	/** Last reset time */
	lastResetTime: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
	allowed: boolean;
	reason?: string;
	retryAfter?: number; // milliseconds
}

/**
 * Plugin Rate Limiter
 *
 * Manages rate limiting for plugin API calls and resource usage.
 * Uses in-memory storage (for single-instance deployments).
 * For multi-instance deployments, consider using Redis or database.
 */
class PluginRateLimiter {
	private static instance: PluginRateLimiter | null = null;
	private pluginStates: Map<string, PluginRateLimitState> = new Map();
	private config: RateLimitConfig = DEFAULT_CONFIG;

	private constructor() {
		// Clean up old entries every minute
		setInterval(() => {
			this.cleanup();
		}, 60 * 1000);
	}

	public static getInstance(): PluginRateLimiter {
		if (!PluginRateLimiter.instance) {
			PluginRateLimiter.instance = new PluginRateLimiter();
		}
		return PluginRateLimiter.instance;
	}

	/**
	 * Check if API call is allowed
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional, defaults to "system" if not provided)
	 * @returns Rate limit check result
	 */
	public checkAPICall(
		pluginId: string,
		userId?: string,
	): RateLimitResult {
		const effectiveUserId = userId || "system";
		const state = this.getOrCreateState(pluginId, effectiveUserId);
		const now = Date.now();

		// Check concurrent calls
		if (state.concurrentCalls >= this.config.maxConcurrentCalls) {
			return {
				allowed: false,
				reason: `Too many concurrent API calls (max: ${this.config.maxConcurrentCalls})`,
			};
		}

		// Clean old timestamps (older than 1 hour)
		const oneHourAgo = now - 60 * 60 * 1000;
		state.callTimestamps = state.callTimestamps.filter(
			(ts) => ts > oneHourAgo,
		);

		// Check hourly limit
		const callsLastHour = state.callTimestamps.length;
		if (callsLastHour >= this.config.maxCallsPerHour) {
			const oldestCall = Math.min(...state.callTimestamps);
			const retryAfter = oldestCall + 60 * 60 * 1000 - now;
			return {
				allowed: false,
				reason: `Hourly API call limit exceeded (max: ${this.config.maxCallsPerHour})`,
				retryAfter: Math.max(0, retryAfter),
			};
		}

		// Check per-minute limit
		const oneMinuteAgo = now - 60 * 1000;
		const callsLastMinute = state.callTimestamps.filter(
			(ts) => ts > oneMinuteAgo,
		).length;

		if (callsLastMinute >= this.config.maxCallsPerMinute) {
			const oldestCallInMinute = Math.min(
				...state.callTimestamps.filter((ts) => ts > oneMinuteAgo),
			);
			const retryAfter = oldestCallInMinute + 60 * 1000 - now;
			return {
				allowed: false,
				reason: `Per-minute API call limit exceeded (max: ${this.config.maxCallsPerMinute})`,
				retryAfter: Math.max(0, retryAfter),
			};
		}

		// Allow the call
		state.callTimestamps.push(now);
		state.concurrentCalls++;

		return { allowed: true };
	}

	/**
	 * Record API call completion
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional, defaults to "system" if not provided)
	 */
	public recordAPICallComplete(pluginId: string, userId?: string): void {
		const effectiveUserId = userId || "system";
		const state = this.getOrCreateState(pluginId, effectiveUserId);
		if (state.concurrentCalls > 0) {
			state.concurrentCalls--;
		}
	}

	/**
	 * Check storage quota
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional, defaults to "system" if not provided)
	 * @param additionalBytes Additional bytes to store
	 * @returns Rate limit check result
	 */
	public checkStorageQuota(
		pluginId: string,
		userId: string | undefined,
		additionalBytes: number,
	): RateLimitResult {
		const effectiveUserId = userId || "system";
		const state = this.getOrCreateState(pluginId, effectiveUserId);

		if (state.storageBytes + additionalBytes > this.config.maxStorageBytes) {
			return {
				allowed: false,
				reason: `Storage quota exceeded (max: ${this.config.maxStorageBytes} bytes)`,
			};
		}

		return { allowed: true };
	}

	/**
	 * Record storage usage
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional, defaults to "system" if not provided)
	 * @param bytes Storage size in bytes
	 */
	public recordStorageUsage(
		pluginId: string,
		userId: string | undefined,
		bytes: number,
	): void {
		const effectiveUserId = userId || "system";
		const state = this.getOrCreateState(pluginId, effectiveUserId);
		state.storageBytes = bytes;
	}

	/**
	 * Get or create rate limit state for plugin
	 */
	private getOrCreateState(
		pluginId: string,
		userId: string,
	): PluginRateLimitState {
		const key = `${userId}:${pluginId}`;
		let state = this.pluginStates.get(key);

		if (!state) {
			state = {
				pluginId,
				userId,
				callTimestamps: [],
				concurrentCalls: 0,
				storageBytes: 0,
				lastResetTime: Date.now(),
			};
			this.pluginStates.set(key, state);
		}

		return state;
	}

	/**
	 * Clean up old entries
	 */
	private cleanup(): void {
		const now = Date.now();
		const oneHourAgo = now - 60 * 60 * 1000;

		for (const [key, state] of this.pluginStates.entries()) {
			// Remove entries with no recent activity
			if (
				state.callTimestamps.length === 0 &&
				state.concurrentCalls === 0 &&
				state.lastResetTime < oneHourAgo
			) {
				this.pluginStates.delete(key);
			}
		}
	}

	/**
	 * Reset rate limit state for a plugin (for testing)
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID
	 */
	public reset(pluginId: string, userId: string): void {
		const key = `${userId}:${pluginId}`;
		this.pluginStates.delete(key);
	}

	/**
	 * Get current rate limit state (for debugging)
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID
	 * @returns Current state or null
	 */
	public getState(
		pluginId: string,
		userId: string,
	): PluginRateLimitState | null {
		const key = `${userId}:${pluginId}`;
		return this.pluginStates.get(key) || null;
	}
}

/**
 * Get singleton instance
 */
export function getPluginRateLimiter(): PluginRateLimiter {
	return PluginRateLimiter.getInstance();
}

