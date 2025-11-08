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

/**
 * Temporary storage for widget render functions registered before plugin activation
 */
const pendingWidgetRenders = new Map<
	string,
	(...args: unknown[]) => unknown | Promise<unknown>
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
			async registerWidget(options: unknown): Promise<void> {
				// Extract render function and store it as a plugin method
				const widgetOptions = options as {
					id: string;
					render?: unknown;
					[name: string]: unknown;
				};

				if (
					widgetOptions.render &&
					typeof widgetOptions.render === "function"
				) {
					// Store render function as a plugin method
					const methodName = `__widget_render_${widgetOptions.id}`;

					// Store in plugin instance methods (will be available after activation)
					if (pluginInstance) {
						// Store in plugin instance methods
						pluginInstance.methods[methodName] = widgetOptions.render as (
							...args: unknown[]
						) => unknown | Promise<unknown>;
					} else {
						// Plugin not initialized yet, store in temporary storage
						pendingWidgetRenders.set(
							methodName,
							widgetOptions.render as (
								...args: unknown[]
							) => unknown | Promise<unknown>,
						);
					}

					// Remove render function from options before registering
					const { render, ...optionsWithoutRender } = widgetOptions;
					await callHostAPI("ui", "registerWidget", [optionsWithoutRender]);
				} else {
					await callHostAPI("ui", "registerWidget", [options]);
				}
			},
			async unregisterWidget(widgetId: string): Promise<void> {
				await callHostAPI("ui", "unregisterWidget", [widgetId]);
			},
			async registerPage(options: unknown): Promise<void> {
				await callHostAPI("ui", "registerPage", [options]);
			},
			async unregisterPage(pageId: string): Promise<void> {
				await callHostAPI("ui", "unregisterPage", [pageId]);
			},
			async registerSidebarPanel(options: unknown): Promise<void> {
				await callHostAPI("ui", "registerSidebarPanel", [options]);
			},
			async unregisterSidebarPanel(panelId: string): Promise<void> {
				await callHostAPI("ui", "unregisterSidebarPanel", [panelId]);
			},
		},
		editor: {
			async registerExtension(options: unknown): Promise<void> {
				await callHostAPI("editor", "registerExtension", [options]);
			},
			async unregisterExtension(extensionId: string): Promise<void> {
				await callHostAPI("editor", "unregisterExtension", [extensionId]);
			},
			async executeCommand(
				command: string,
				...args: unknown[]
			): Promise<unknown> {
				return await callHostAPI("editor", "executeCommand", [
					command,
					...args,
				]);
			},
			async getContent(editorId?: string): Promise<unknown> {
				return await callHostAPI("editor", "getContent", [editorId]);
			},
			async setContent(content: unknown, editorId?: string): Promise<void> {
				await callHostAPI("editor", "setContent", [content, editorId]);
			},
			async getSelection(editorId?: string): Promise<unknown> {
				return await callHostAPI("editor", "getSelection", [editorId]);
			},
			async setSelection(
				from: number,
				to: number,
				editorId?: string,
			): Promise<void> {
				await callHostAPI("editor", "setSelection", [from, to, editorId]);
			},
			async canExecuteCommand(
				command: string,
				editorId?: string,
			): Promise<boolean> {
				return (await callHostAPI("editor", "canExecuteCommand", [
					command,
					editorId,
				])) as boolean;
			},
		},
		ai: {
			async registerQuestionGenerator(options: unknown): Promise<void> {
				await callHostAPI("ai", "registerQuestionGenerator", [options]);
			},
			async unregisterQuestionGenerator(generatorId: string): Promise<void> {
				await callHostAPI("ai", "unregisterQuestionGenerator", [generatorId]);
			},
			async registerPromptTemplate(options: unknown): Promise<void> {
				await callHostAPI("ai", "registerPromptTemplate", [options]);
			},
			async unregisterPromptTemplate(templateId: string): Promise<void> {
				await callHostAPI("ai", "unregisterPromptTemplate", [templateId]);
			},
			async registerContentAnalyzer(options: unknown): Promise<void> {
				await callHostAPI("ai", "registerContentAnalyzer", [options]);
			},
			async unregisterContentAnalyzer(analyzerId: string): Promise<void> {
				await callHostAPI("ai", "unregisterContentAnalyzer", [analyzerId]);
			},
		},
		data: {
			async registerImporter(options: unknown): Promise<void> {
				await callHostAPI("data", "registerImporter", [options]);
			},
			async unregisterImporter(importerId: string): Promise<void> {
				await callHostAPI("data", "unregisterImporter", [importerId]);
			},
			async registerExporter(options: unknown): Promise<void> {
				await callHostAPI("data", "registerExporter", [options]);
			},
			async unregisterExporter(exporterId: string): Promise<void> {
				await callHostAPI("data", "unregisterExporter", [exporterId]);
			},
			async registerTransformer(options: unknown): Promise<void> {
				await callHostAPI("data", "registerTransformer", [options]);
			},
			async unregisterTransformer(transformerId: string): Promise<void> {
				await callHostAPI("data", "unregisterTransformer", [transformerId]);
			},
		},
		integration: {
			async registerOAuthProvider(options: unknown): Promise<void> {
				await callHostAPI("integration", "registerOAuthProvider", [options]);
			},
			async unregisterOAuthProvider(providerId: string): Promise<void> {
				await callHostAPI("integration", "unregisterOAuthProvider", [
					providerId,
				]);
			},
			async registerWebhook(options: unknown): Promise<void> {
				await callHostAPI("integration", "registerWebhook", [options]);
			},
			async unregisterWebhook(webhookId: string): Promise<void> {
				await callHostAPI("integration", "unregisterWebhook", [webhookId]);
			},
			async registerExternalAPI(options: unknown): Promise<void> {
				await callHostAPI("integration", "registerExternalAPI", [options]);
			},
			async unregisterExternalAPI(apiId: string): Promise<void> {
				await callHostAPI("integration", "unregisterExternalAPI", [apiId]);
			},
			async callExternalAPI(
				apiId: string | undefined,
				options: unknown,
			): Promise<unknown> {
				return await callHostAPI("integration", "callExternalAPI", [
					apiId,
					options,
				]);
			},
		},
		calendar: {
			async registerExtension(options: unknown): Promise<void> {
				await callHostAPI("calendar", "registerExtension", [options]);
			},
			async unregisterExtension(extensionId: string): Promise<void> {
				await callHostAPI("calendar", "unregisterExtension", [extensionId]);
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
 *
 * Security: Uses Blob URL + importScripts instead of eval/new Function
 */
async function handleInit(payload: InitPayload): Promise<void> {
	try {
		const { manifest, code, config } = payload;

		// Create plugin API proxy
		const api = createPluginAPIProxy();

		// Create Blob URL for plugin code (avoiding eval)
		// Wrap plugin code in IIFE to isolate scope and expose activate function
		const wrappedCode = `
(function() {
  'use strict';
  
  // Plugin code executed in isolated scope
  ${code}
  
  // Expose activate function or plugin object to global scope for this worker
  if (typeof activate === 'function') {
    self.__pluginActivate = activate;
  } else if (typeof plugin !== 'undefined') {
    self.__pluginObject = plugin;
  }
})();
`;

		// Create Blob URL
		const blob = new Blob([wrappedCode], { type: "application/javascript" });
		const blobUrl = URL.createObjectURL(blob);

		try {
			// Load plugin code using importScripts (safer than eval)
			// @ts-expect-error - importScripts is available in WorkerGlobalScope but not in TypeScript types
			self.importScripts(blobUrl);

			// Get plugin from global scope
			let plugin: {
				methods?: Record<
					string,
					(...args: unknown[]) => unknown | Promise<unknown>
				>;
				dispose?: () => void | Promise<void>;
			} = {};

			// Check for activate function or plugin object on global scope
			const globalScope = self as unknown as {
				__pluginActivate?: (
					api: unknown,
					config: Record<string, unknown>,
				) => Promise<{
					methods?: Record<
						string,
						(...args: unknown[]) => unknown | Promise<unknown>
					>;
					dispose?: () => void | Promise<void>;
				}>;
				__pluginObject?: {
					methods?: Record<
						string,
						(...args: unknown[]) => unknown | Promise<unknown>
					>;
					dispose?: () => void | Promise<void>;
				};
			};

			if (typeof globalScope.__pluginActivate === "function") {
				// Call activate function with API and config
				plugin = (await globalScope.__pluginActivate(api, config || {})) || {};
			} else if (globalScope.__pluginObject) {
				plugin = globalScope.__pluginObject;
			}

			// Clean up global scope
			delete globalScope.__pluginActivate;
			delete globalScope.__pluginObject;

			// Store plugin instance
			pluginInstance = {
				id: manifest.id,
				name: manifest.name,
				version: manifest.version,
				methods: {
					...plugin.methods,
					// Add pending widget render functions
					...Object.fromEntries(pendingWidgetRenders),
				},
				dispose: plugin.dispose,
			};

			// Clear pending widget renders
			pendingWidgetRenders.clear();

			// Send success response
			sendMessage({
				type: "INIT",
				payload: {
					success: true,
					pluginId: manifest.id,
				},
			});
		} finally {
			// Cleanup blob URL
			URL.revokeObjectURL(blobUrl);
		}
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
