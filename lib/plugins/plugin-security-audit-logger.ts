/**
 * Plugin Security Audit Logger
 *
 * Records security-related events for plugin system including:
 * - API calls from plugins
 * - Rate limit violations
 * - Execution timeouts
 * - Storage access
 * - Security violations
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-loader/worker-message-handler.ts
 *   ├─ lib/plugins/plugin-rate-limiter.ts
 *   ├─ lib/plugins/plugin-execution-monitor.ts
 *   └─ lib/plugins/plugin-api.ts
 *
 * Dependencies:
 *   ├─ lib/logger.ts
 *   └─ lib/supabase/adminClient.ts
 *
 * Related Documentation:
 *   └─ Issue #96: Plugin System Security Enhancement
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import logger from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/adminClient";
import type { Database } from "@/types/database.types";

/**
 * Security audit event types
 */
export type SecurityAuditEventType =
	| "api_call"
	| "api_call_failed"
	| "rate_limit_violation"
	| "execution_timeout"
	| "storage_access"
	| "storage_quota_exceeded"
	| "plugin_error"
	| "plugin_terminated"
	| "unauthorized_access_attempt"
	| "signature_verification";

/**
 * Security audit event severity levels
 */
export type SecurityAuditSeverity = "low" | "medium" | "high" | "critical";

/**
 * Base security audit event structure
 */
interface BaseSecurityAuditEvent {
	/** Event type */
	eventType: SecurityAuditEventType;
	/** Severity level */
	severity: SecurityAuditSeverity;
	/** Plugin ID */
	pluginId: string;
	/** User ID (if available) */
	userId?: string;
	/** Timestamp */
	timestamp: number;
	/** Additional context */
	context?: Record<string, unknown>;
}

/**
 * API call audit event
 */
export interface APICallAuditEvent extends BaseSecurityAuditEvent {
	eventType: "api_call" | "api_call_failed";
	namespace: string;
	method: string;
	/** Arguments summary (sanitized, no sensitive data) */
	argsSummary?: string;
	/** Whether the call succeeded */
	success: boolean;
	/** Error message if failed */
	error?: string;
	/** Request ID */
	requestId: string;
}

/**
 * Rate limit violation audit event
 */
export interface RateLimitViolationAuditEvent extends BaseSecurityAuditEvent {
	eventType: "rate_limit_violation";
	reason: string;
	/** Retry after time in milliseconds */
	retryAfter?: number;
	/** Current call count */
	currentCallCount?: number;
	/** Limit that was exceeded */
	limit?: number;
}

/**
 * Execution timeout audit event
 */
export interface ExecutionTimeoutAuditEvent extends BaseSecurityAuditEvent {
	eventType: "execution_timeout";
	/** Execution time in milliseconds */
	executionTime: number;
	/** Maximum allowed execution time */
	maxExecutionTime: number;
	reason: string;
}

/**
 * Storage access audit event
 */
export interface StorageAccessAuditEvent extends BaseSecurityAuditEvent {
	eventType: "storage_access" | "storage_quota_exceeded";
	operation: "get" | "set" | "delete" | "clear" | "keys";
	/** Storage key (may be sanitized) */
	key?: string;
	/** Storage size in bytes */
	size?: number;
	/** Maximum storage quota */
	maxQuota?: number;
}

/**
 * Plugin error audit event
 */
export interface PluginErrorAuditEvent extends BaseSecurityAuditEvent {
	eventType: "plugin_error";
	errorMessage: string;
	errorStack?: string;
}

/**
 * Plugin terminated audit event
 */
export interface PluginTerminatedAuditEvent extends BaseSecurityAuditEvent {
	eventType: "plugin_terminated";
	reason: string;
	executionTime: number;
}

/**
 * Signature verification audit event
 */
export interface SignatureVerificationAuditEvent
	extends BaseSecurityAuditEvent {
	eventType: "signature_verification";
	/** Whether verification was successful */
	success: boolean;
	/** Error message if verification failed */
	error?: string;
	/** Algorithm used for verification */
	algorithm?: string;
}

/**
 * Union type for all security audit events
 */
export type SecurityAuditEvent =
	| APICallAuditEvent
	| RateLimitViolationAuditEvent
	| ExecutionTimeoutAuditEvent
	| StorageAccessAuditEvent
	| PluginErrorAuditEvent
	| PluginTerminatedAuditEvent
	| SignatureVerificationAuditEvent
	| BaseSecurityAuditEvent;

/**
 * Plugin Security Audit Logger
 *
 * Records security-related events for plugin system.
 * Uses structured logging for easy searching and analysis.
 */
class PluginSecurityAuditLogger {
	/**
	 * Track last log time for rate limit violations to prevent log spam
	 * Key: pluginId, Value: last log timestamp
	 */
	private lastRateLimitLogTime: Map<string, number> = new Map();

	/**
	 * Minimum interval between rate limit violation logs (milliseconds)
	 */
	private readonly RATE_LIMIT_LOG_INTERVAL = 1000; // 1 second

	/**
	 * Log a security audit event
	 *
	 * @param event Security audit event
	 */
	public log(event: SecurityAuditEvent): void {
		// Determine log level based on severity
		const logLevel = this.getLogLevel(event.severity);

		// Prepare log context
		const logContext: Record<string, unknown> = {
			audit: true,
			eventType: event.eventType,
			severity: event.severity,
			pluginId: event.pluginId,
			timestamp: new Date(event.timestamp).toISOString(),
			...event.context,
		};

		// Prepare event data for database
		const eventData: Record<string, unknown> = {};

		// Add event-specific fields
		if ("namespace" in event && "method" in event) {
			logContext.namespace = event.namespace;
			logContext.method = event.method;
			logContext.requestId = event.requestId;
			eventData.namespace = event.namespace;
			eventData.method = event.method;
			eventData.requestId = event.requestId;
			if (event.argsSummary) {
				logContext.argsSummary = event.argsSummary;
				eventData.argsSummary = event.argsSummary;
			}
			if (event.success !== undefined) {
				logContext.success = event.success;
				eventData.success = event.success;
			}
			if (event.error) {
				logContext.error = event.error;
				eventData.error = event.error;
			}
		}

		if ("reason" in event) {
			logContext.reason = event.reason;
			eventData.reason = event.reason;

			// Add rate limit violation specific fields
			if ("retryAfter" in event && event.retryAfter !== undefined) {
				logContext.retryAfter = event.retryAfter;
				eventData.retryAfter = event.retryAfter;
			}
			if ("currentCallCount" in event && event.currentCallCount !== undefined) {
				logContext.currentCallCount = event.currentCallCount;
				eventData.currentCallCount = event.currentCallCount;
			}
			if ("limit" in event && event.limit !== undefined) {
				logContext.limit = event.limit;
				eventData.limit = event.limit;
			}
		}

		if ("executionTime" in event) {
			logContext.executionTime = event.executionTime;
			eventData.executionTime = event.executionTime;

			// Add execution timeout specific fields
			if ("maxExecutionTime" in event) {
				logContext.maxExecutionTime = event.maxExecutionTime;
				eventData.maxExecutionTime = event.maxExecutionTime;
			}
		}

		if ("operation" in event) {
			logContext.operation = event.operation;
			eventData.operation = event.operation;
			if (event.key) {
				logContext.storageKey = event.key;
				eventData.storageKey = event.key;
			}
			if (event.size !== undefined) {
				logContext.storageSize = event.size;
				eventData.storageSize = event.size;
			}
			if (event.maxQuota !== undefined) {
				logContext.maxStorageQuota = event.maxQuota;
				eventData.maxStorageQuota = event.maxQuota;
			}
		}

		if ("errorMessage" in event) {
			logContext.errorMessage = event.errorMessage;
			eventData.errorMessage = event.errorMessage;
			if (event.errorStack) {
				logContext.errorStack = event.errorStack;
				eventData.errorStack = event.errorStack;
			}
		}

		if ("success" in event && event.eventType === "signature_verification") {
			logContext.signatureVerificationSuccess = event.success;
			eventData.signatureVerificationSuccess = event.success;
			if (event.error) {
				logContext.signatureVerificationError = event.error;
				eventData.signatureVerificationError = event.error;
			}
			if (event.algorithm) {
				logContext.signatureAlgorithm = event.algorithm;
				eventData.signatureAlgorithm = event.algorithm;
			}
		}

		if (event.userId) {
			logContext.userId = event.userId;
		}

		// Sanitize log context to remove null/undefined values
		// Pino logger may call Object.getPrototypeOf on values, which fails for null/undefined
		const safeLogContext: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(logContext)) {
			if (value !== null && value !== undefined) {
				// Only include primitive types and plain objects
				const valueType = typeof value;
				if (
					valueType === "string" ||
					valueType === "number" ||
					valueType === "boolean" ||
					(valueType === "object" &&
						value !== null &&
						Object.prototype.toString.call(value) === "[object Object]")
				) {
					safeLogContext[key] = value;
				}
			}
		}

		// Log with appropriate level
		const message = this.getLogMessage(event);
		// Use switch statement instead of dynamic access to avoid runtime errors
		// Wrap in try-catch to prevent logging errors from breaking the audit flow
		try {
			switch (logLevel) {
				case "error":
					logger.error(safeLogContext, message);
					break;
				case "warn":
					logger.warn(safeLogContext, message);
					break;
				default:
					logger.info(safeLogContext, message);
					break;
			}
		} catch (logError) {
			// Fallback: log with minimal data if serialization fails
			// Use try-catch to prevent infinite error loops
			try {
				logger.error(
					{
						pluginId: event.pluginId,
						eventType: event.eventType,
						errorMessage:
							logError instanceof Error ? logError.message : String(logError),
					},
					"Failed to log security audit event",
				);
			} catch {
				// If even fallback logging fails, silently ignore to prevent infinite loops
			}
		}

		// Save to database asynchronously (don't block on errors)
		this.saveToDatabase(event, eventData).catch((error) => {
			logger.error(
				{ error, pluginId: event.pluginId, eventType: event.eventType },
				"Failed to save security audit log to database",
			);
		});
	}

	/**
	 * Save audit event to database
	 *
	 * @param event Security audit event
	 * @param eventData Event data prepared for database
	 */
	private async saveToDatabase(
		event: SecurityAuditEvent,
		eventData: Record<string, unknown>,
	): Promise<void> {
		// Check if Supabase is configured before attempting to create client
		// This prevents errors in development/local plugin development environments
		const supabaseUrl =
			typeof process !== "undefined"
				? process.env.NEXT_PUBLIC_SUPABASE_URL
				: undefined;
		const serviceRoleKey =
			typeof process !== "undefined"
				? process.env.SUPABASE_SERVICE_ROLE_KEY
				: undefined;

		// Skip database save if Supabase is not configured
		// This is expected in development/local plugin development environments
		if (!supabaseUrl || !serviceRoleKey) {
			logger.debug(
				{
					pluginId: event.pluginId,
					eventType: event.eventType,
					hasSupabaseUrl: !!supabaseUrl,
					hasServiceRoleKey: !!serviceRoleKey,
				},
				"Skipping audit log save (Supabase not configured - expected in local development)",
			);
			return;
		}

		// Use admin client (service role) to bypass RLS for system logs
		let supabase: SupabaseClient<Database>;
		try {
			supabase = createAdminClient();
		} catch (error) {
			// If createAdminClient fails even though env vars are set, log and skip
			logger.warn(
				{
					pluginId: event.pluginId,
					eventType: event.eventType,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to create admin client for audit log save (skipping)",
			);
			return;
		}

		const { error } = await supabase
			.from("plugin_security_audit_logs" as never)
			.insert({
				plugin_id: event.pluginId,
				user_id: event.userId || null,
				event_type: event.eventType,
				severity: event.severity,
				event_data: eventData,
				context: event.context || {},
				created_at: new Date(event.timestamp).toISOString(),
			} as never);

		if (error) {
			throw error;
		}
	}

	/**
	 * Log API call
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional)
	 * @param namespace API namespace
	 * @param method API method
	 * @param args Arguments (will be sanitized)
	 * @param requestId Request ID
	 * @param success Whether the call succeeded
	 * @param error Error message if failed
	 */
	public logAPICall(
		pluginId: string,
		namespace: string,
		method: string,
		args: unknown[],
		requestId: string,
		success: boolean,
		userId?: string,
		error?: string,
	): void {
		const event: APICallAuditEvent = {
			eventType: success ? "api_call" : "api_call_failed",
			severity: success ? "low" : "medium",
			pluginId,
			userId,
			timestamp: Date.now(),
			namespace,
			method,
			argsSummary: this.sanitizeArgs(args),
			success,
			error,
			requestId,
		};

		this.log(event);
	}

	/**
	 * Log rate limit violation
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional)
	 * @param reason Reason for violation
	 * @param retryAfter Retry after time in milliseconds
	 * @param currentCallCount Current call count
	 * @param limit Limit that was exceeded
	 */
	public logRateLimitViolation(
		pluginId: string,
		reason: string,
		userId?: string,
		retryAfter?: number,
		currentCallCount?: number,
		limit?: number,
	): void {
		// Throttle rate limit violation logs to prevent log spam
		const now = Date.now();
		const lastLogTime = this.lastRateLimitLogTime.get(pluginId);
		if (
			lastLogTime !== undefined &&
			now - lastLogTime < this.RATE_LIMIT_LOG_INTERVAL
		) {
			// Skip logging if we've logged a rate limit violation for this plugin recently
			return;
		}

		// Update last log time
		this.lastRateLimitLogTime.set(pluginId, now);

		const event: RateLimitViolationAuditEvent = {
			eventType: "rate_limit_violation",
			severity: "high",
			pluginId,
			userId,
			timestamp: now,
			reason,
			retryAfter,
			currentCallCount,
			limit,
		};

		this.log(event);
	}

	/**
	 * Log execution timeout
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional)
	 * @param executionTime Execution time in milliseconds
	 * @param maxExecutionTime Maximum allowed execution time
	 * @param reason Reason for timeout
	 */
	public logExecutionTimeout(
		pluginId: string,
		executionTime: number,
		maxExecutionTime: number,
		reason: string,
		userId?: string,
	): void {
		const event: ExecutionTimeoutAuditEvent = {
			eventType: "execution_timeout",
			severity: "high",
			pluginId,
			userId,
			timestamp: Date.now(),
			executionTime,
			maxExecutionTime,
			reason,
		};

		this.log(event);
	}

	/**
	 * Log storage access
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional)
	 * @param operation Storage operation
	 * @param key Storage key (optional)
	 * @param size Storage size in bytes (optional)
	 * @param maxQuota Maximum storage quota (optional)
	 */
	public logStorageAccess(
		pluginId: string,
		operation: "get" | "set" | "delete" | "clear" | "keys",
		userId?: string,
		key?: string,
		size?: number,
		maxQuota?: number,
	): void {
		const eventType: "storage_access" | "storage_quota_exceeded" =
			maxQuota && size && size > maxQuota
				? "storage_quota_exceeded"
				: "storage_access";

		const event: StorageAccessAuditEvent = {
			eventType,
			severity: eventType === "storage_quota_exceeded" ? "high" : "low",
			pluginId,
			userId,
			timestamp: Date.now(),
			operation,
			key: key ? this.sanitizeKey(key) : undefined,
			size,
			maxQuota,
		};

		this.log(event);
	}

	/**
	 * Log plugin error
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional)
	 * @param errorMessage Error message
	 * @param errorStack Error stack (optional)
	 */
	public logPluginError(
		pluginId: string,
		errorMessage: string,
		userId?: string,
		errorStack?: string,
	): void {
		const event: PluginErrorAuditEvent = {
			eventType: "plugin_error",
			severity: "medium",
			pluginId,
			userId,
			timestamp: Date.now(),
			errorMessage,
			errorStack,
		};

		this.log(event);
	}

	/**
	 * Log plugin termination
	 *
	 * @param pluginId Plugin ID
	 * @param userId User ID (optional)
	 * @param reason Reason for termination
	 * @param executionTime Execution time in milliseconds
	 */
	public logPluginTerminated(
		pluginId: string,
		reason: string,
		executionTime: number,
		userId?: string,
	): void {
		const event: PluginTerminatedAuditEvent = {
			eventType: "plugin_terminated",
			severity: "high",
			pluginId,
			userId,
			timestamp: Date.now(),
			reason,
			executionTime,
		};

		this.log(event);
	}

	/**
	 * Log signature verification
	 *
	 * @param pluginId Plugin ID
	 * @param error Error message if verification failed (null if successful)
	 * @param success Whether verification was successful
	 * @param userId User ID (optional)
	 * @param algorithm Signature algorithm used (optional)
	 */
	public logSignatureVerification(
		pluginId: string,
		error: string | null,
		success: boolean,
		userId?: string,
		algorithm?: string,
	): void {
		const event: SignatureVerificationAuditEvent = {
			eventType: "signature_verification",
			severity: success ? "low" : "high",
			pluginId,
			userId,
			timestamp: Date.now(),
			success,
			error: error || undefined,
			algorithm,
		};

		this.log(event);
	}

	/**
	 * Sanitize arguments for logging (remove sensitive data)
	 *
	 * @param args Arguments array
	 * @returns Sanitized string summary
	 */
	private sanitizeArgs(args: unknown[]): string {
		if (args.length === 0) {
			return "[]";
		}

		// Limit to first 3 arguments and truncate long strings
		const sanitized = args.slice(0, 3).map((arg) => {
			if (typeof arg === "string") {
				// Truncate long strings
				if (arg.length > 100) {
					return `${arg.substring(0, 100)}...`;
				}
				return arg;
			}
			if (typeof arg === "object" && arg !== null) {
				// Stringify objects but limit size
				const str = JSON.stringify(arg);
				if (str.length > 200) {
					return `${str.substring(0, 200)}...`;
				}
				return str;
			}
			return String(arg);
		});

		return JSON.stringify(sanitized);
	}

	/**
	 * Sanitize storage key (remove sensitive parts)
	 *
	 * @param key Storage key
	 * @returns Sanitized key
	 */
	private sanitizeKey(key: string): string {
		// For now, just return the key as-is
		// In production, might want to sanitize sensitive keys
		if (key.length > 100) {
			return `${key.substring(0, 100)}...`;
		}
		return key;
	}

	/**
	 * Get log level based on severity
	 *
	 * @param severity Severity level
	 * @returns Log level
	 */
	private getLogLevel(
		severity: SecurityAuditSeverity,
	): "info" | "warn" | "error" {
		switch (severity) {
			case "critical":
			case "high":
				return "error";
			case "medium":
				return "warn";
			default:
				return "info";
		}
	}

	/**
	 * Get log message based on event type
	 *
	 * @param event Security audit event
	 * @returns Log message
	 */
	private getLogMessage(event: SecurityAuditEvent): string {
		switch (event.eventType) {
			case "api_call":
			case "api_call_failed":
				if ("namespace" in event && "method" in event) {
					return `Plugin API call${event.eventType === "api_call_failed" ? " failed" : ""}: ${event.namespace}.${event.method}`;
				}
				return `Plugin API call${event.eventType === "api_call_failed" ? " failed" : ""}: ${event.pluginId}`;
			case "rate_limit_violation":
				return `Plugin rate limit violated: ${event.pluginId}`;
			case "execution_timeout":
				return `Plugin execution timeout: ${event.pluginId}`;
			case "storage_access":
				if ("operation" in event) {
					return `Plugin storage access: ${event.operation}`;
				}
				return `Plugin storage access: ${event.pluginId}`;
			case "storage_quota_exceeded":
				return `Plugin storage quota exceeded: ${event.pluginId}`;
			case "plugin_error":
				return `Plugin error: ${event.pluginId}`;
			case "plugin_terminated":
				return `Plugin terminated: ${event.pluginId}`;
			case "signature_verification":
				if ("success" in event) {
					return `Plugin signature verification ${event.success ? "succeeded" : "failed"}: ${event.pluginId}`;
				}
				return `Plugin signature verification: ${event.pluginId}`;
			default:
				return `Security audit event: ${event.eventType}`;
		}
	}
}

/**
 * Get singleton instance
 */
let auditLoggerInstance: PluginSecurityAuditLogger | null = null;

export function getPluginSecurityAuditLogger(): PluginSecurityAuditLogger {
	if (!auditLoggerInstance) {
		auditLoggerInstance = new PluginSecurityAuditLogger();
	}
	return auditLoggerInstance;
}
