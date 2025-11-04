/**
 * Plugin Sandbox Worker
 *
 * This Web Worker provides a sandboxed execution environment for plugins.
 * Plugins run in isolation and can only access the host application through
 * the Plugin API via message passing.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that use this):
 *   └─ lib/plugins/plugin-loader.ts (creates Worker instances)
 *
 * Dependencies:
 *   └─ lib/plugins/types.ts (message protocol types)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 *
 * Security Model:
 * - No direct DOM access
 * - No direct database access
 * - All API calls proxied through postMessage
 * - Code execution isolated from main thread
 */

import logger from "@/lib/logger";
import type {
	APICallPayload,
	APIResponsePayload,
	CallMethodPayload,
	ErrorPayload,
	EventPayload,
	InitPayload,
	WorkerMessage,
} from "./types";

// ============================================================================
// Worker State
// ============================================================================

/**
 * Plugin instance loaded in worker
 */
interface PluginInstance {
	id: string;
	name: string;
	version: string;
	methods: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
	dispose?: () => void | Promise<void>;
}

let pluginInstance: PluginInstance | null = null;
let requestId = 0;
const pendingRequests = new Map<
	string,
	{
		resolve: (value: unknown) => void;
		reject: (reason: unknown) => void;
	}
>();

// ============================================================================
// Plugin API Proxy (Worker-side)
// ============================================================================

/**
 * Create Plugin API proxy for use within the worker
 *
 * This proxy sends API calls to the host via postMessage
 * and waits for responses.
 */
function createPluginAPIProxy() {
	return {
		app: {
			async getVersion(): Promise<string> {
				return (await callHostAPI("app", "getVersion", [])) as string;
			},
			async getName(): Promise<string> {
				return (await callHostAPI("app", "getName", [])) as string;
			},
			async getUserId(): Promise<string | null> {
				return (await callHostAPI("app", "getUserId", [])) as string | null;
			},
		},

		storage: {
			async get<T = unknown>(key: string): Promise<T | undefined> {
				return (await callHostAPI("storage", "get", [key])) as T | undefined;
			},
			async set(key: string, value: unknown): Promise<void> {
				await callHostAPI("storage", "set", [key, value]);
			},
			async delete(key: string): Promise<void> {
				await callHostAPI("storage", "delete", [key]);
			},
			async keys(): Promise<string[]> {
				return (await callHostAPI("storage", "keys", [])) as string[];
			},
			async clear(): Promise<void> {
				await callHostAPI("storage", "clear", []);
			},
		},

		notifications: {
			show(message: string, type = "info"): void {
				callHostAPI("notifications", "show", [message, type]);
			},
			info(message: string): void {
				callHostAPI("notifications", "info", [message]);
			},
			success(message: string): void {
				callHostAPI("notifications", "success", [message]);
			},
			error(message: string): void {
				callHostAPI("notifications", "error", [message]);
			},
			warning(message: string): void {
				callHostAPI("notifications", "warning", [message]);
			},
		},

		ui: {
			async registerCommand(command: unknown): Promise<void> {
				await callHostAPI("ui", "registerCommand", [command]);
			},
			async unregisterCommand(commandId: string): Promise<void> {
				await callHostAPI("ui", "unregisterCommand", [commandId]);
			},
			async showDialog(options: unknown): Promise<unknown> {
				return await callHostAPI("ui", "showDialog", [options]);
			},
		},
	};
}

/**
 * Call host API method via postMessage
 *
 * @param namespace API namespace (e.g., "storage", "notifications")
 * @param method Method name
 * @param args Method arguments
 * @returns Promise that resolves with the result
 */
function callHostAPI(
	namespace: string,
	method: string,
	args: unknown[],
): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const reqId = `req_${++requestId}`;

		pendingRequests.set(reqId, { resolve, reject });

		const message: WorkerMessage<APICallPayload> = {
			type: "API_CALL",
			requestId: reqId,
			payload: {
				namespace,
				method,
				args,
			},
		};

		self.postMessage(message);

		// Timeout after 30 seconds
		setTimeout(() => {
			if (pendingRequests.has(reqId)) {
				pendingRequests.delete(reqId);
				reject(new Error(`API call timeout: ${namespace}.${method}`));
			}
		}, 30000);
	});
}

// ============================================================================
// Message Handlers
// ============================================================================

/**
 * Handle INIT message - Initialize plugin
 */
async function handleInit(payload: InitPayload): Promise<void> {
	try {
		const { manifest, code, config } = payload;

		// Create plugin API proxy
		const api = createPluginAPIProxy();

		// Create a safe execution context
		const pluginFactory = new Function(
			"api",
			"config",
			`
      ${code}
      
      // Plugin code should export a default function or object
      if (typeof activate === 'function') {
        return activate(api, config);
      }
      
      // Or return the plugin object directly
      return plugin || {};
    `,
		);

		// Execute plugin code
		const plugin = await pluginFactory(api, config || {});

		// Store plugin instance
		pluginInstance = {
			id: manifest.id,
			name: manifest.name,
			version: manifest.version,
			methods: plugin.methods || {},
			dispose: plugin.dispose,
		};

		// Send success response
		sendMessage({
			type: "INIT",
			payload: {
				success: true,
				pluginId: manifest.id,
			},
		});
	} catch (error) {
		// Send error response
		sendError(error);
	}
}

/**
 * Handle CALL_METHOD message - Call plugin method
 */
async function handleCallMethod(payload: CallMethodPayload): Promise<void> {
	try {
		if (!pluginInstance) {
			throw new Error("Plugin not initialized");
		}

		const { method, args } = payload;
		const fn = pluginInstance.methods[method];

		if (!fn || typeof fn !== "function") {
			throw new Error(`Method ${method} not found in plugin`);
		}

		// Call plugin method
		const result = await fn(...args);

		// Send result back to host
		sendMessage({
			type: "CALL_METHOD",
			payload: {
				success: true,
				result,
			},
		});
	} catch (error) {
		sendError(error);
	}
}

/**
 * Handle DISPOSE message - Clean up plugin
 */
async function handleDispose(): Promise<void> {
	try {
		if (pluginInstance?.dispose) {
			await pluginInstance.dispose();
		}

		pluginInstance = null;
		pendingRequests.clear();

		sendMessage({
			type: "DISPOSE",
			payload: {
				success: true,
			},
		});
	} catch (error) {
		sendError(error);
	}
}

/**
 * Handle API_RESPONSE message - Response from host API call
 */
function handleAPIResponse(
	requestId: string,
	payload: APIResponsePayload,
): void {
	const pending = pendingRequests.get(requestId);

	if (!pending) {
		logger.warn({ requestId }, "No pending request found for API response");
		return;
	}

	pendingRequests.delete(requestId);

	if (payload.success) {
		pending.resolve(payload.result);
	} else {
		pending.reject(new Error(payload.error || "API call failed"));
	}
}

// ============================================================================
// Message Sending
// ============================================================================

/**
 * Send message to host
 */
function sendMessage(message: WorkerMessage): void {
	self.postMessage(message);
}

/**
 * Send error to host
 */
function sendError(error: unknown): void {
	const errorPayload: ErrorPayload = {
		message: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
	};

	sendMessage({
		type: "ERROR",
		payload: errorPayload,
	});
}

/**
 * Send event to host
 */
export function sendEvent(eventName: string, data: unknown): void {
	const eventPayload: EventPayload = {
		eventName,
		data,
	};

	sendMessage({
		type: "EVENT",
		payload: eventPayload,
	});
}

// ============================================================================
// Worker Message Handler
// ============================================================================

/**
 * Main message handler for the worker
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const { type, requestId, payload } = event.data;

	try {
		switch (type) {
			case "INIT":
				await handleInit(payload as InitPayload);
				break;

			case "CALL_METHOD":
				await handleCallMethod(payload as CallMethodPayload);
				break;

			case "DISPOSE":
				await handleDispose();
				break;

			case "API_RESPONSE":
				if (requestId) {
					handleAPIResponse(requestId, payload as APIResponsePayload);
				}
				break;

			default:
				logger.warn({ messageType: type }, "Unknown message type received");
		}
	} catch (error) {
		sendError(error);
	}
};

/**
 * Worker error handler
 */
self.onerror = (event: ErrorEvent | string | Event) => {
	const error =
		typeof event === "string"
			? new Error(event)
			: event instanceof ErrorEvent
				? event.error || new Error(event.message)
				: new Error(String(event));
	logger.error(
		{
			error: error instanceof Error ? error : new Error(String(error)),
			pluginId: pluginInstance?.id,
		},
		"Uncaught error in sandbox worker",
	);
	sendError(error instanceof Error ? error : new Error(String(error)));
};

/**
 * Worker unhandled rejection handler
 */
self.onunhandledrejection = (event: PromiseRejectionEvent) => {
	const error =
		event.reason instanceof Error
			? event.reason
			: new Error(String(event.reason));
	logger.error(
		{ error, pluginId: pluginInstance?.id },
		"Unhandled promise rejection in sandbox worker",
	);
	sendError(event.reason);
};
