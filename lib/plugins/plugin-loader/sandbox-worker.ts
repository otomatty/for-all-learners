/**
 * Sandbox Worker Implementation
 *
 * This is the actual Web Worker code that runs in a sandboxed environment.
 * The code is converted to JavaScript string format by sandbox-worker-code.ts
 * for use in Web Workers.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that use this):
 *   └─ lib/plugins/plugin-loader/sandbox-worker-code.ts (loads this file)
 *
 * Dependencies:
 *   └─ None (pure worker code, no external dependencies)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

type PluginInstance = {
	id: string;
	name: string;
	version: string;
	methods: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
	dispose?: () => void | Promise<void>;
};

type PluginManifest = {
	id: string;
	name: string;
	version: string;
};

// Worker state
let pluginInstance: PluginInstance | null = null;
let requestId = 0;
const pendingRequests = new Map<
	string,
	{ resolve: (value: unknown) => void; reject: (reason?: Error) => void }
>();
const pendingWorkerMethods = new Map<
	string,
	(...args: unknown[]) => unknown | Promise<unknown>
>();

const registerWorkerMethod = (
	methodName: string,
	fn: (...args: unknown[]) => unknown | Promise<unknown>,
): void => {
	if (pluginInstance) {
		pluginInstance.methods[methodName] = fn;
	} else {
		pendingWorkerMethods.set(methodName, fn);
	}
};

// Message types
const MessageTypes = {
	INIT: "INIT",
	CALL_METHOD: "CALL_METHOD",
	DISPOSE: "DISPOSE",
	API_CALL: "API_CALL",
	API_RESPONSE: "API_RESPONSE",
	ERROR: "ERROR",
	CONSOLE_LOG: "CONSOLE_LOG",
} as const;

// Helper: Serialize argument for postMessage
const serializeArg = (arg: unknown): string => {
	try {
		return typeof arg === "object" ? JSON.stringify(arg) : String(arg);
	} catch {
		return String(arg);
	}
};

// Helper: Forward console logs to main thread
const forwardLog = (level: string, args: unknown[]): void => {
	self.postMessage({
		type: MessageTypes.CONSOLE_LOG,
		payload: { level, args: args.map(serializeArg) },
	});
};

// Override console methods
const originalConsole = {
	// biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
	log: console.log,
	// biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
	error: console.error,
	// biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
	warn: console.warn,
	// biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
	info: console.info,
	// biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
	debug: console.debug,
};

console.log = (...args: unknown[]) => {
	forwardLog("log", args);
	originalConsole.log.apply(console, args);
};

console.error = (...args: unknown[]) => {
	forwardLog("error", args);
	originalConsole.error.apply(console, args);
};

console.warn = (...args: unknown[]) => {
	forwardLog("warn", args);
	originalConsole.warn.apply(console, args);
};

console.info = (...args: unknown[]) => {
	forwardLog("info", args);
	originalConsole.info.apply(console, args);
};

console.debug = (...args: unknown[]) => {
	forwardLog("debug", args);
	originalConsole.debug.apply(console, args);
};

// Helper: Send error message
const sendError = (error: unknown): void => {
	self.postMessage({
		type: MessageTypes.ERROR,
		payload: {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		},
	});
};

// Call host API via postMessage
const callHostAPI = (
	namespace: string,
	method: string,
	args: unknown[],
): Promise<unknown> => {
	return new Promise((resolve, reject) => {
		const reqId = `req_${++requestId}`;
		pendingRequests.set(reqId, { resolve, reject });

		self.postMessage({
			type: MessageTypes.API_CALL,
			requestId: reqId,
			payload: { namespace, method, args },
		});

		setTimeout(() => {
			if (pendingRequests.has(reqId)) {
				pendingRequests.delete(reqId);
				reject(new Error(`API call timeout: ${namespace}.${method}`));
			}
		}, 30000);
	});
};

// Create Plugin API proxy
const createPluginAPIProxy = () => ({
	app: {
		getVersion: () => callHostAPI("app", "getVersion", []),
		getName: () => callHostAPI("app", "getName", []),
		getUserId: () => callHostAPI("app", "getUserId", []),
	},
	storage: {
		get: (key: string) => callHostAPI("storage", "get", [key]),
		set: (key: string, value: unknown) =>
			callHostAPI("storage", "set", [key, value]),
		delete: (key: string) => callHostAPI("storage", "delete", [key]),
		keys: () => callHostAPI("storage", "keys", []),
		clear: () => callHostAPI("storage", "clear", []),
	},
	notifications: {
		show: (message: string, type?: string) =>
			callHostAPI("notifications", "show", [message, type]),
		info: (message: string) => callHostAPI("notifications", "info", [message]),
		success: (message: string) =>
			callHostAPI("notifications", "success", [message]),
		error: (message: string) =>
			callHostAPI("notifications", "error", [message]),
		warning: (message: string) =>
			callHostAPI("notifications", "warning", [message]),
	},
	ui: {
		registerCommand: (command: unknown) =>
			callHostAPI("ui", "registerCommand", [
				(() => {
					if (!command || typeof command !== "object") {
						return command;
					}

					const commandOptions = command as {
						id?: string;
						handler?: unknown;
						execute?: unknown;
						[key: string]: unknown;
					};

					if (!commandOptions.id) {
						return command;
					}

					const handler =
						typeof commandOptions.handler === "function"
							? commandOptions.handler
							: typeof commandOptions.execute === "function"
								? commandOptions.execute
								: null;

					if (!handler) {
						return command;
					}

					const methodName = `__command_handler_${commandOptions.id}`;
					registerWorkerMethod(
						methodName,
						handler as (...args: unknown[]) => unknown | Promise<unknown>,
					);

					const {
						handler: _handler,
						execute: _execute,
						...rest
					} = commandOptions;
					return rest;
				})(),
			]),
		unregisterCommand: (commandId: string) =>
			callHostAPI("ui", "unregisterCommand", [commandId]),
		showDialog: (options: unknown) =>
			callHostAPI("ui", "showDialog", [options]),
		registerWidget: (options: {
			id?: string;
			render?: (...args: unknown[]) => unknown | Promise<unknown>;
			[key: string]: unknown;
		}) => {
			const widgetOptions = options || {};
			if (widgetOptions.render && typeof widgetOptions.render === "function") {
				const methodName = `__widget_render_${widgetOptions.id}`;
				registerWorkerMethod(methodName, widgetOptions.render);
				const { render: _render, ...optionsWithoutRender } = widgetOptions;
				return callHostAPI("ui", "registerWidget", [optionsWithoutRender]);
			}
			return callHostAPI("ui", "registerWidget", [options]);
		},
		unregisterWidget: (widgetId: string) =>
			callHostAPI("ui", "unregisterWidget", [widgetId]),
		registerPage: (options: unknown) =>
			callHostAPI("ui", "registerPage", [options]),
		unregisterPage: (pageId: string) =>
			callHostAPI("ui", "unregisterPage", [pageId]),
		registerSidebarPanel: (options: unknown) =>
			callHostAPI("ui", "registerSidebarPanel", [options]),
		unregisterSidebarPanel: (panelId: string) =>
			callHostAPI("ui", "unregisterSidebarPanel", [panelId]),
	},
	calendar: {
		registerExtension: (options: unknown) =>
			callHostAPI("calendar", "registerExtension", [
				(() => {
					if (!options || typeof options !== "object") {
						return options;
					}

					const extensionOptions = options as {
						id?: string;
						getDailyData?: unknown;
						[key: string]: unknown;
					};

					if (
						!extensionOptions.id ||
						typeof extensionOptions.getDailyData !== "function"
					) {
						return options;
					}

					const methodName = `__calendar_getDailyData_${extensionOptions.id}`;
					registerWorkerMethod(
						methodName,
						extensionOptions.getDailyData as (
							...args: unknown[]
						) => unknown | Promise<unknown>,
					);

					const { getDailyData: _getDailyData, ...rest } = extensionOptions;
					return rest;
				})(),
			]),
		unregisterExtension: (extensionId: string) =>
			callHostAPI("calendar", "unregisterExtension", [extensionId]),
	},
	integration: {
		registerOAuthProvider: (options: unknown) =>
			callHostAPI("integration", "registerOAuthProvider", [options]),
		unregisterOAuthProvider: (providerId: string) =>
			callHostAPI("integration", "unregisterOAuthProvider", [providerId]),
		registerWebhook: (options: unknown) =>
			callHostAPI("integration", "registerWebhook", [options]),
		unregisterWebhook: (webhookId: string) =>
			callHostAPI("integration", "unregisterWebhook", [webhookId]),
		registerExternalAPI: (options: unknown) =>
			callHostAPI("integration", "registerExternalAPI", [options]),
		unregisterExternalAPI: (apiId: string) =>
			callHostAPI("integration", "unregisterExternalAPI", [apiId]),
		callExternalAPI: (apiId: string, request: unknown) =>
			callHostAPI("integration", "callExternalAPI", [apiId, request]),
	},
	editor: {
		registerExtension: (options: unknown) =>
			callHostAPI("editor", "registerExtension", [options]),
		unregisterExtension: (extensionId: string) =>
			callHostAPI("editor", "unregisterExtension", [extensionId]),
		executeCommand: (command: string, ...args: unknown[]) =>
			callHostAPI("editor", "executeCommand", [command, ...args]),
		getContent: (editorId?: string) =>
			callHostAPI("editor", "getContent", [editorId]),
		setContent: (content: string, editorId?: string) =>
			callHostAPI("editor", "setContent", [content, editorId]),
		getSelection: (editorId?: string) =>
			callHostAPI("editor", "getSelection", [editorId]),
		setSelection: (from: number, to: number, editorId?: string) =>
			callHostAPI("editor", "setSelection", [from, to, editorId]),
		canExecuteCommand: (command: string, editorId?: string) =>
			callHostAPI("editor", "canExecuteCommand", [command, editorId]),
	},
});

// Handle INIT message
const handleInit = async (payload: {
	manifest: PluginManifest;
	code: string;
	config?: Record<string, unknown>;
}): Promise<void> => {
	try {
		const { manifest, code, config } = payload;
		const api = createPluginAPIProxy();

		const wrappedCode = `(() => {
  "use strict";
  ${code}
  if (typeof activate === "function") {
    self.__pluginActivate = activate;
  } else if (typeof plugin !== "undefined") {
    self.__pluginObject = plugin;
  }
})();`;

		const blob = new Blob([wrappedCode], { type: "application/javascript" });
		const blobUrl = URL.createObjectURL(blob);

		try {
			// @ts-expect-error - importScripts is available in WorkerGlobalScope
			self.importScripts(blobUrl);

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

			let plugin: {
				methods?: Record<
					string,
					(...args: unknown[]) => unknown | Promise<unknown>
				>;
				dispose?: () => void | Promise<void>;
			} = {};

			if (typeof globalScope.__pluginActivate === "function") {
				plugin = (await globalScope.__pluginActivate(api, config || {})) || {};
			} else if (globalScope.__pluginObject) {
				plugin = globalScope.__pluginObject;
			}

			delete globalScope.__pluginActivate;
			delete globalScope.__pluginObject;

			pluginInstance = {
				id: manifest.id,
				name: manifest.name,
				version: manifest.version,
				methods: {
					...(plugin.methods || {}),
					...Object.fromEntries(pendingWorkerMethods),
				},
				dispose: plugin.dispose,
			};

			pendingWorkerMethods.clear();

			self.postMessage({
				type: MessageTypes.INIT,
				payload: { success: true, pluginId: manifest.id },
			});
		} finally {
			URL.revokeObjectURL(blobUrl);
		}
	} catch (error) {
		sendError(error);
	}
};

// Handle CALL_METHOD message
const handleCallMethod = async (payload: {
	method: string;
	args: unknown[];
}): Promise<void> => {
	try {
		if (!pluginInstance) {
			throw new Error("Plugin not initialized");
		}

		const { method, args } = payload;
		const fn = pluginInstance.methods[method];

		if (!fn || typeof fn !== "function") {
			throw new Error(`Method ${method} not found in plugin`);
		}

		const result = await fn(...args);

		self.postMessage({
			type: MessageTypes.CALL_METHOD,
			payload: { success: true, result },
		});
	} catch (error) {
		sendError(error);
	}
};

// Handle DISPOSE message
const handleDispose = async (): Promise<void> => {
	try {
		if (pluginInstance?.dispose) {
			await pluginInstance.dispose();
		}

		pluginInstance = null;
		pendingRequests.clear();

		self.postMessage({
			type: MessageTypes.DISPOSE,
			payload: { success: true },
		});
	} catch (error) {
		sendError(error);
	}
};

// Handle API_RESPONSE message
const handleAPIResponse = (
	requestId: string,
	payload:
		| { success: boolean; result?: unknown; error?: string }
		| undefined
		| null,
): void => {
	const pending = pendingRequests.get(requestId);
	if (!pending) {
		return;
	}

	pendingRequests.delete(requestId);

	// Guard against undefined or invalid payload
	if (payload === undefined || payload === null) {
		pending.reject(new Error("API response payload is missing"));
		return;
	}

	if (typeof payload !== "object") {
		pending.reject(new Error("Invalid API response payload type"));
		return;
	}

	// Check if payload has success property
	if (!("success" in payload)) {
		pending.reject(new Error("API response payload missing success property"));
		return;
	}

	// Type guard: ensure payload is a valid API response object
	const apiResponse = payload as {
		success: boolean;
		result?: unknown;
		error?: string;
	};

	// Additional safety check
	if (!apiResponse || typeof apiResponse !== "object") {
		pending.reject(new Error("Invalid API response object"));
		return;
	}

	if (apiResponse.success) {
		pending.resolve(apiResponse.result);
	} else {
		const errorMessage =
			apiResponse.error && typeof apiResponse.error === "string"
				? apiResponse.error
				: "API call failed";
		pending.reject(new Error(errorMessage));
	}
};

// Main message handler
self.onmessage = async (
	event: MessageEvent<{
		type: string;
		requestId?: string;
		payload: unknown;
	}>,
): Promise<void> => {
	const { type, requestId, payload } = event.data;

	try {
		switch (type) {
			case MessageTypes.INIT:
				await handleInit(
					payload as {
						manifest: PluginManifest;
						code: string;
						config?: Record<string, unknown>;
					},
				);
				break;
			case MessageTypes.CALL_METHOD:
				await handleCallMethod(payload as { method: string; args: unknown[] });
				break;
			case MessageTypes.DISPOSE:
				await handleDispose();
				break;
			case MessageTypes.API_RESPONSE:
				if (requestId) {
					// handleAPIResponse will handle undefined/null payload gracefully
					handleAPIResponse(
						requestId,
						payload as
							| { success: boolean; result?: unknown; error?: string }
							| undefined
							| null,
					);
				}
				break;
		}
	} catch (error) {
		sendError(error);
	}
};

// Error handlers
self.onerror = ((event: ErrorEvent | string): void => {
	const error =
		typeof event === "string" ? new Error(event) : event.error || event;
	sendError(error);
}) as OnErrorEventHandler;

self.onunhandledrejection = (event: PromiseRejectionEvent): void => {
	sendError(event.reason);
};
