/**
 * Worker Message Handler
 *
 * Handles messages from Web Workers and routes them to appropriate handlers.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-loader/plugin-loader.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-api.ts
 *   ├─ lib/plugins/plugin-registry.ts
 *   └─ lib/plugins/types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

import logger from "@/lib/logger";
import { createPluginAPI } from "../plugin-api";
import { getPluginExecutionMonitor } from "../plugin-execution-monitor";
import { getPluginRateLimiter } from "../plugin-rate-limiter";
import { getPluginRegistry } from "../plugin-registry";
import { getPluginSecurityAuditLogger } from "../plugin-security-audit-logger";
import type {
	APICallPayload,
	APIResponsePayload,
	ErrorPayload,
	WorkerMessage,
} from "../types";

/**
 * Handle message from worker
 *
 * @param pluginId Plugin ID
 * @param message Message from worker
 * @param workers Map of plugin ID to worker (for sending responses)
 */
export function handleWorkerMessage(
	pluginId: string,
	message: WorkerMessage,
	workers: Map<string, Worker>,
): void {
	switch (message.type) {
		case "API_CALL": {
			if (!message.requestId) {
				logger.error(
					{ pluginId, messageType: message.type },
					"API_CALL message missing requestId",
				);
				return;
			}
			handleAPICall(
				pluginId,
				message.requestId,
				message.payload as APICallPayload,
				workers,
			);
			break;
		}

		case "EVENT": {
			const eventPayload = message.payload as {
				eventName: string;
				data: unknown;
			};
			logger.debug(
				{
					pluginId,
					eventName: eventPayload.eventName,
					eventData: eventPayload.data,
				},
				"Plugin event received",
			);
			break;
		}

		case "CONSOLE_LOG": {
			const consolePayload = message.payload as {
				level: "log" | "error" | "warn" | "info" | "debug";
				args: string[];
			};
			const messageText = consolePayload.args.join(" ");

			// Log to debug tools (async import to avoid circular dependency)
			// Use void to explicitly ignore the promise (fire and forget)
			void import("../debug-tools")
				.then(({ logPluginMessage }) => {
					logPluginMessage(
						pluginId,
						consolePayload.level === "error"
							? "error"
							: consolePayload.level === "warn"
								? "warn"
								: consolePayload.level === "debug"
									? "debug"
									: "info",
						messageText,
					);
				})
				.catch((error) => {
					// Silently fail if debug tools are not available
					logger.debug({ error, pluginId }, "Failed to log to debug tools");
				});

			// Also log to main logger
			if (consolePayload.level === "error") {
				logger.error({ pluginId }, `[Plugin Console] ${messageText}`);
			} else if (consolePayload.level === "warn") {
				logger.warn({ pluginId }, `[Plugin Console] ${messageText}`);
			} else {
				logger.debug({ pluginId }, `[Plugin Console] ${messageText}`);
			}
			break;
		}

		case "ERROR": {
			const errorPayload = message.payload as ErrorPayload;
			const errorMessage = errorPayload.message || "Unknown error";
			const errorStack = errorPayload.stack;

			// Log plugin error to security audit log
			const auditLogger = getPluginSecurityAuditLogger();
			auditLogger.logPluginError(
				pluginId,
				errorMessage,
				undefined, // userId not available yet
				errorStack,
			);

			// Log to debug tools (async import to avoid circular dependency)
			const registry = getPluginRegistry();
			const plugin = registry.get(pluginId);
			void import("../debug-tools")
				.then(({ logPluginError }) => {
					logPluginError(
						pluginId,
						errorMessage,
						errorStack,
						plugin?.manifest.name,
					);
				})
				.catch((err) => {
					// Silently fail if debug tools are not available
					logger.debug(
						{
							pluginId,
							errorMessage: err instanceof Error ? err.message : String(err),
						},
						"Failed to log error to debug tools",
					);
				});

			// In browser environment, extract error properties instead of passing error object
			const logContext: Record<string, unknown> = {
				pluginId,
				errorMessage,
			};
			if (errorStack) {
				logContext.errorStack = errorStack;
			}
			logger.error(logContext, "Plugin error received");
			registry.setError(pluginId, errorMessage);
			break;
		}

		case "INIT":
		case "DISPOSE": {
			// These messages are handled directly by worker-manager.ts
			// Ignore them here to avoid duplicate processing
			break;
		}

		default: {
			logger.warn(
				{ pluginId, messageType: message.type },
				"Unknown plugin message type",
			);
		}
	}
}

/**
 * Handle API call from plugin
 *
 * @param pluginId Plugin ID
 * @param requestId Request ID
 * @param payload API call payload
 * @param workers Map of plugin ID to worker
 */
async function handleAPICall(
	pluginId: string,
	requestId: string,
	payload: APICallPayload,
	workers: Map<string, Worker>,
): Promise<void> {
	const rateLimiter = getPluginRateLimiter();
	const executionMonitor = getPluginExecutionMonitor();
	const auditLogger = getPluginSecurityAuditLogger();
	const worker = workers.get(pluginId);

	// Update activity time for execution monitoring
	executionMonitor.updateActivity(pluginId);

	// Check rate limit before processing
	// TODO: Get actual userId from plugin context when available
	const rateLimitResult = rateLimiter.checkAPICall(pluginId);

	if (!rateLimitResult.allowed) {
		// Log rate limit violation
		auditLogger.logRateLimitViolation(
			pluginId,
			rateLimitResult.reason || "Rate limit exceeded",
			undefined, // userId not available yet
			rateLimitResult.retryAfter,
			undefined, // currentCallCount not available
			undefined, // limit not available
		);

		// Send rate limit error response
		if (worker) {
			const responsePayload: APIResponsePayload = {
				success: false,
				error: rateLimitResult.reason || "Rate limit exceeded",
			};

			const response: WorkerMessage<APIResponsePayload> = {
				type: "API_RESPONSE",
				requestId,
				payload: responsePayload,
			};

			worker.postMessage(response);
		}

		logger.warn(
			{
				pluginId,
				reason: rateLimitResult.reason,
				retryAfter: rateLimitResult.retryAfter,
			},
			"Plugin API call rate limited",
		);
		return;
	}

	try {
		const api = createPluginAPI(pluginId);
		const { namespace, method, args } = payload;

		// Get API namespace
		const nsAPI = (api as unknown as Record<string, unknown>)[namespace];

		if (!nsAPI || typeof nsAPI !== "object") {
			throw new Error(`Invalid API namespace: ${namespace}`);
		}

		// Get method
		const methodFn = (nsAPI as Record<string, unknown>)[method];

		if (typeof methodFn !== "function") {
			throw new Error(`Invalid API method: ${namespace}.${method}`);
		}

		// Call method
		// Note: render function handling for widgets is done in sandbox-worker.ts
		const result = await methodFn(...args);

		// Log successful API call (don't let logging errors break API calls)
		try {
			auditLogger.logAPICall(
				pluginId,
				namespace,
				method,
				args,
				requestId,
				true,
				undefined, // userId not available yet
			);
		} catch (logError) {
			// Log the logging error but don't fail the API call
			logger.warn(
				{
					error: logError,
					pluginId,
					namespace,
					method,
				},
				"Failed to log API call (non-fatal)",
			);
		}

		// Send response
		if (worker) {
			const responsePayload: APIResponsePayload = {
				success: true,
				result,
			};

			const response: WorkerMessage<APIResponsePayload> = {
				type: "API_RESPONSE",
				requestId,
				payload: responsePayload,
			};

			worker.postMessage(response);
		}
	} catch (error) {
		// Log failed API call (don't let logging errors break error handling)
		try {
			auditLogger.logAPICall(
				pluginId,
				payload.namespace,
				payload.method,
				payload.args,
				requestId,
				false,
				undefined, // userId not available yet
				error instanceof Error ? error.message : String(error),
			);
		} catch (logError) {
			// Log the logging error but don't fail error handling
			logger.warn(
				{
					error: logError,
					pluginId,
					namespace: payload.namespace,
					method: payload.method,
				},
				"Failed to log API call error (non-fatal)",
			);
		}

		// Send error response
		if (worker) {
			const responsePayload: APIResponsePayload = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};

			const response: WorkerMessage<APIResponsePayload> = {
				type: "API_RESPONSE",
				requestId,
				payload: responsePayload,
			};

			worker.postMessage(response);
		}
	} finally {
		// Record API call completion
		rateLimiter.recordAPICallComplete(pluginId);
	}
}
