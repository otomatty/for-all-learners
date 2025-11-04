/**
 * Plugin Loader
 *
 * Handles loading, unloading, and dependency resolution for plugins.
 * Creates Web Worker sandboxes and manages plugin lifecycle.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ app/_actions/plugins.ts
 *   └─ app/(protected)/settings/plugins/page.tsx
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-registry.ts
 *   ├─ lib/plugins/plugin-api.ts
 *   ├─ lib/plugins/editor-registry.ts
 *   ├─ lib/plugins/editor-manager.ts
 *   ├─ lib/plugins/types.ts
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   ├─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 *   └─ Plan: docs/03_plans/plugin-system/phase2-editor-extensions.md
 */

import logger from "@/lib/logger";
import type { LoadedPlugin, PluginManifest } from "@/types/plugin";
import { getAIExtensionRegistry } from "./ai-registry";
import { getEditorManager } from "./editor-manager";
import { getEditorExtensionRegistry } from "./editor-registry";
import { clearPluginCommands, createPluginAPI } from "./plugin-api";
import { getPluginRegistry } from "./plugin-registry";
import {
	type APICallPayload,
	type APIResponsePayload,
	type DependencyResolutionResult,
	type ErrorPayload,
	type InitPayload,
	PluginError,
	PluginErrorType,
	type PluginLoadOptions,
	type PluginLoadResult,
	type PluginValidationResult,
	type WorkerMessage,
} from "./types";

// ============================================================================
// Plugin Loader Class
// ============================================================================

/**
 * Plugin Loader
 *
 * Manages plugin lifecycle: loading, unloading, enabling, disabling.
 * Handles dependency resolution and Web Worker management.
 */
export class PluginLoader {
	private static instance: PluginLoader | null = null;

	/** Map of plugin ID to Web Worker */
	private workers: Map<string, Worker>;

	/**
	 * Private constructor (Singleton pattern)
	 */
	private constructor() {
		this.workers = new Map();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): PluginLoader {
		if (!PluginLoader.instance) {
			PluginLoader.instance = new PluginLoader();
		}
		return PluginLoader.instance;
	}

	/**
	 * Reset loader (for testing)
	 */
	public static reset(): void {
		PluginLoader.instance = null;
	}

	// ========================================================================
	// Plugin Loading
	// ========================================================================

	/**
	 * Load a plugin
	 *
	 * @param manifest Plugin manifest
	 * @param code Plugin code as string
	 * @param options Load options
	 * @returns Load result
	 */
	public async loadPlugin(
		manifest: PluginManifest,
		code: string,
		options: PluginLoadOptions = {},
	): Promise<PluginLoadResult> {
		const pluginId = manifest.id;

		try {
			// Step 1: Validate manifest
			const validation = this.validateManifest(manifest);
			if (!validation.valid) {
				throw new PluginError(
					PluginErrorType.INVALID_MANIFEST,
					`Invalid manifest: ${validation.errors.join(", ")}`,
					pluginId,
				);
			}

			// Step 2: Check if already loaded
			const registry = getPluginRegistry();
			if (registry.has(pluginId)) {
				throw new PluginError(
					PluginErrorType.LOAD_FAILED,
					`Plugin ${pluginId} is already loaded`,
					pluginId,
				);
			}

			// Step 3: Resolve dependencies
			const depResolution = this.resolveDependencies(manifest);
			if (depResolution.missingDependencies.length > 0) {
				const missing = depResolution.missingDependencies
					.map((d) => `${d.requiredPlugin}@${d.requiredVersion}`)
					.join(", ");
				throw new PluginError(
					PluginErrorType.MISSING_DEPENDENCY,
					`Missing dependencies: ${missing}`,
					pluginId,
				);
			}

			// Step 4: Create Web Worker
			const worker = this.createWorker(pluginId);
			this.workers.set(pluginId, worker);

			// Step 5: Initialize plugin in worker
			await this.initializePlugin(worker, manifest, code, options.config);

			// Step 6: Register plugin
			const loadedPlugin: LoadedPlugin = {
				manifest,
				enabled: options.enableImmediately ?? true,
				worker,
				loadedAt: new Date(),
			};

			registry.register(loadedPlugin);

			logger.info(
				{
					pluginId,
					pluginName: manifest.name,
					version: manifest.version,
					enabled: loadedPlugin.enabled,
				},
				"Plugin loaded successfully",
			);

			return {
				success: true,
				plugin: loadedPlugin,
			};
		} catch (error) {
			// Cleanup on error
			this.cleanupWorker(pluginId);

			const message = error instanceof Error ? error.message : "Unknown error";

			logger.error(
				{
					error,
					pluginId,
					pluginName: manifest.name,
					errorType: error instanceof PluginError ? error.type : undefined,
				},
				"Failed to load plugin",
			);

			return {
				success: false,
				error: message,
			};
		}
	}

	/**
	 * Unload a plugin
	 *
	 * @param pluginId Plugin ID
	 */
	public async unloadPlugin(pluginId: string): Promise<void> {
		const registry = getPluginRegistry();
		const plugin = registry.get(pluginId);

		if (!plugin) {
			throw new PluginError(
				PluginErrorType.LOAD_FAILED,
				`Plugin ${pluginId} not found`,
				pluginId,
			);
		}

		try {
			// Step 1: Dispose plugin in worker
			const worker = this.workers.get(pluginId);
			if (worker) {
				await this.disposePlugin(worker);
			}

			// Step 2: Clear commands
			clearPluginCommands(pluginId);

			// Step 3: Clear editor extensions
			const extensionRegistry = getEditorExtensionRegistry();
			if (extensionRegistry.hasExtensions(pluginId)) {
				extensionRegistry.clearPlugin(pluginId);

				// Reapply extensions to all editors
				const editorManager = getEditorManager();
				editorManager.applyExtensionsToAllEditors();

				logger.info({ pluginId }, "Editor extensions cleared for plugin");
			}

			// Step 4: Clear AI extensions
			const aiRegistry = getAIExtensionRegistry();
			aiRegistry.clearPlugin(pluginId);
			logger.info({ pluginId }, "AI extensions cleared for plugin");

			// Step 5: Cleanup worker
			this.cleanupWorker(pluginId);

			// Step 6: Unregister from registry
			registry.unregister(pluginId);

			logger.info(
				{ pluginId, pluginName: plugin.manifest.name },
				"Plugin unloaded successfully",
			);
		} catch (error) {
			logger.error(
				{ error, pluginId, pluginName: plugin.manifest.name },
				"Error unloading plugin",
			);
			throw error;
		}
	}

	/**
	 * Reload a plugin
	 *
	 * @param pluginId Plugin ID
	 * @param code New plugin code
	 * @param options Load options
	 */
	public async reloadPlugin(
		pluginId: string,
		code: string,
		options: PluginLoadOptions = {},
	): Promise<PluginLoadResult> {
		const registry = getPluginRegistry();
		const existingPlugin = registry.get(pluginId);

		if (!existingPlugin) {
			throw new PluginError(
				PluginErrorType.LOAD_FAILED,
				`Plugin ${pluginId} not found`,
				pluginId,
			);
		}

		// Unload existing plugin
		await this.unloadPlugin(pluginId);

		// Load new version
		return await this.loadPlugin(existingPlugin.manifest, code, options);
	}

	// ========================================================================
	// Manifest Validation
	// ========================================================================

	/**
	 * Validate plugin manifest
	 *
	 * @param manifest Plugin manifest to validate
	 * @returns Validation result
	 */
	private validateManifest(manifest: PluginManifest): PluginValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Required fields
		if (!manifest.id || typeof manifest.id !== "string") {
			errors.push("manifest.id is required and must be a string");
		}

		if (!manifest.name || typeof manifest.name !== "string") {
			errors.push("manifest.name is required and must be a string");
		}

		if (!manifest.version || typeof manifest.version !== "string") {
			errors.push("manifest.version is required and must be a string");
		}

		if (!manifest.description || typeof manifest.description !== "string") {
			errors.push("manifest.description is required and must be a string");
		}

		if (!manifest.author || typeof manifest.author !== "string") {
			errors.push("manifest.author is required and must be a string");
		}

		if (!manifest.main || typeof manifest.main !== "string") {
			errors.push("manifest.main is required and must be a string");
		}

		// Extension points
		if (
			!manifest.extensionPoints ||
			typeof manifest.extensionPoints !== "object"
		) {
			errors.push("manifest.extensionPoints is required and must be an object");
		} else {
			const hasExtension = Object.values(manifest.extensionPoints).some(
				(v) => v === true,
			);
			if (!hasExtension) {
				warnings.push(
					"No extension points are enabled - plugin will not provide any functionality",
				);
			}
		}

		// Version format (basic semver check)
		if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
			warnings.push(
				"manifest.version should follow semantic versioning (e.g., 1.0.0)",
			);
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	// ========================================================================
	// Dependency Resolution
	// ========================================================================

	/**
	 * Resolve plugin dependencies
	 *
	 * @param manifest Plugin manifest
	 * @returns Dependency resolution result
	 */
	private resolveDependencies(
		manifest: PluginManifest,
	): DependencyResolutionResult {
		const registry = getPluginRegistry();
		const missingDependencies: Array<{
			pluginId: string;
			requiredPlugin: string;
			requiredVersion: string;
		}> = [];

		if (manifest.dependencies) {
			for (const [depPluginId, versionRange] of Object.entries(
				manifest.dependencies,
			)) {
				const depPlugin = registry.get(depPluginId);

				if (!depPlugin) {
					missingDependencies.push({
						pluginId: manifest.id,
						requiredPlugin: depPluginId,
						requiredVersion: versionRange,
					});
				}
				// TODO: Implement semver version range checking
				// For Phase 1, we just check if the dependency is loaded
			}
		}

		return {
			loadOrder: [manifest.id],
			circularDependencies: [],
			missingDependencies,
		};
	}

	// ========================================================================
	// Worker Management
	// ========================================================================

	/**
	 * Create Web Worker for plugin
	 *
	 * @param pluginId Plugin ID
	 * @returns Worker instance
	 */
	private createWorker(pluginId: string): Worker {
		// Create worker from inline sandbox worker code
		// Note: In production, this should be loaded from a separate file
		// For now, we'll create a blob URL with the worker code
		const workerCode = this.getSandboxWorkerCode();

		const blob = new Blob([workerCode], { type: "application/javascript" });
		const workerUrl = URL.createObjectURL(blob);

		const worker = new Worker(workerUrl, {
			type: "classic", // Use classic mode for simpler execution
			name: `plugin-${pluginId}`,
		});

		// Set up message handler
		worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
			this.handleWorkerMessage(pluginId, event.data);
		};

		// Set up error handler
		worker.onerror = (error: ErrorEvent) => {
			logger.error(
				{
					error: error.error || new Error(error.message),
					pluginId,
					workerName: `plugin-${pluginId}`,
				},
				"Plugin worker error",
			);
			const registry = getPluginRegistry();
			registry.setError(pluginId, error.message);
		};

		// Cleanup blob URL when worker is terminated
		const originalTerminate = worker.terminate.bind(worker);
		worker.terminate = () => {
			URL.revokeObjectURL(workerUrl);
			originalTerminate();
		};

		return worker;
	}

	/**
	 * Get sandbox worker code as string
	 *
	 * This method returns the sandbox worker code as a string.
	 * In production, this should be loaded from a separate file or bundle.
	 *
	 * @returns Worker code as string
	 */
	private getSandboxWorkerCode(): string {
		// For now, we'll inline the essential parts of sandbox-worker.ts
		// In production, this should be loaded from a bundled worker file
		// or use importScripts with a public URL
		return `
(function() {
  'use strict';
  
  // Worker state
  let pluginInstance = null;
  let requestId = 0;
  const pendingRequests = new Map();
  
  // Message types
  const MessageTypes = {
    INIT: 'INIT',
    CALL_METHOD: 'CALL_METHOD',
    DISPOSE: 'DISPOSE',
    API_CALL: 'API_CALL',
    API_RESPONSE: 'API_RESPONSE',
    EVENT: 'EVENT',
    ERROR: 'ERROR'
  };
  
  // Call host API via postMessage
  function callHostAPI(namespace, method, args) {
    return new Promise((resolve, reject) => {
      const reqId = 'req_' + (++requestId);
      pendingRequests.set(reqId, { resolve, reject });
      
      self.postMessage({
        type: MessageTypes.API_CALL,
        requestId: reqId,
        payload: {
          namespace: namespace,
          method: method,
          args: args
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.has(reqId)) {
          pendingRequests.delete(reqId);
          reject(new Error('API call timeout: ' + namespace + '.' + method));
        }
      }, 30000);
    });
  }
  
  // Create Plugin API proxy
  function createPluginAPIProxy() {
    return {
      app: {
        getVersion: function() { return callHostAPI('app', 'getVersion', []); },
        getName: function() { return callHostAPI('app', 'getName', []); },
        getUserId: function() { return callHostAPI('app', 'getUserId', []); }
      },
      storage: {
        get: function(key) { return callHostAPI('storage', 'get', [key]); },
        set: function(key, value) { return callHostAPI('storage', 'set', [key, value]); },
        delete: function(key) { return callHostAPI('storage', 'delete', [key]); },
        keys: function() { return callHostAPI('storage', 'keys', []); },
        clear: function() { return callHostAPI('storage', 'clear', []); }
      },
      notifications: {
        show: function(message, type) { callHostAPI('notifications', 'show', [message, type]); },
        info: function(message) { callHostAPI('notifications', 'info', [message]); },
        success: function(message) { callHostAPI('notifications', 'success', [message]); },
        error: function(message) { callHostAPI('notifications', 'error', [message]); },
        warning: function(message) { callHostAPI('notifications', 'warning', [message]); }
      },
      ui: {
        registerCommand: function(command) { return callHostAPI('ui', 'registerCommand', [command]); },
        unregisterCommand: function(commandId) { return callHostAPI('ui', 'unregisterCommand', [commandId]); },
        showDialog: function(options) { return callHostAPI('ui', 'showDialog', [options]); }
      }
    };
  }
  
  // Handle INIT message
  async function handleInit(payload) {
    try {
      const { manifest, code, config } = payload;
      const api = createPluginAPIProxy();
      
      // Execute plugin code in a safe context
      // biome-ignore lint/security/noGlobalEval: Plugin code execution requires eval in controlled environment
      const pluginFactory = new Function('api', 'config', 
        code + '\\n' +
        'if (typeof activate === "function") {' +
        '  return activate(api, config);' +
        '}' +
        'return plugin || {};'
      );
      
      const plugin = await pluginFactory(api, config || {});
      
      pluginInstance = {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        methods: plugin.methods || {},
        dispose: plugin.dispose
      };
      
      self.postMessage({
        type: MessageTypes.INIT,
        payload: { success: true, pluginId: manifest.id }
      });
    } catch (error) {
      self.postMessage({
        type: MessageTypes.ERROR,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }
  
  // Handle CALL_METHOD message
  async function handleCallMethod(payload) {
    try {
      if (!pluginInstance) {
        throw new Error('Plugin not initialized');
      }
      
      const { method, args } = payload;
      const fn = pluginInstance.methods[method];
      
      if (!fn || typeof fn !== 'function') {
        throw new Error('Method ' + method + ' not found in plugin');
      }
      
      const result = await fn(...args);
      
      self.postMessage({
        type: MessageTypes.CALL_METHOD,
        payload: { success: true, result: result }
      });
    } catch (error) {
      self.postMessage({
        type: MessageTypes.ERROR,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }
  
  // Handle DISPOSE message
  async function handleDispose() {
    try {
      if (pluginInstance && pluginInstance.dispose) {
        await pluginInstance.dispose();
      }
      
      pluginInstance = null;
      pendingRequests.clear();
      
      self.postMessage({
        type: MessageTypes.DISPOSE,
        payload: { success: true }
      });
    } catch (error) {
      self.postMessage({
        type: MessageTypes.ERROR,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }
  
  // Handle API_RESPONSE message
  function handleAPIResponse(requestId, payload) {
    const pending = pendingRequests.get(requestId);
    if (!pending) {
      console.warn('[SandboxWorker] No pending request for ' + requestId);
      return;
    }
    
    pendingRequests.delete(requestId);
    
    if (payload.success) {
      pending.resolve(payload.result);
    } else {
      pending.reject(new Error(payload.error || 'API call failed'));
    }
  }
  
  // Main message handler
  self.onmessage = async function(event) {
    const { type, requestId, payload } = event.data;
    
    try {
      switch (type) {
        case MessageTypes.INIT:
          await handleInit(payload);
          break;
        case MessageTypes.CALL_METHOD:
          await handleCallMethod(payload);
          break;
        case MessageTypes.DISPOSE:
          await handleDispose();
          break;
        case MessageTypes.API_RESPONSE:
          if (requestId) {
            handleAPIResponse(requestId, payload);
          }
          break;
        default:
          console.warn('[SandboxWorker] Unknown message type: ' + type);
      }
    } catch (error) {
      self.postMessage({
        type: MessageTypes.ERROR,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  };
  
  // Error handlers
  self.onerror = function(error) {
    console.error('[SandboxWorker] Uncaught error:', error);
    self.postMessage({
      type: MessageTypes.ERROR,
      payload: {
        message: error.message || String(error),
        stack: error.stack
      }
    });
  };
  
  self.onunhandledrejection = function(event) {
    console.error('[SandboxWorker] Unhandled rejection:', event.reason);
    self.postMessage({
      type: MessageTypes.ERROR,
      payload: {
        message: event.reason instanceof Error ? event.reason.message : String(event.reason),
        stack: event.reason instanceof Error ? event.reason.stack : undefined
      }
    });
  };
})();
`;
	}

	/**
	 * Initialize plugin in worker
	 *
	 * @param worker Worker instance
	 * @param manifest Plugin manifest
	 * @param code Plugin code
	 * @param config User configuration
	 */
	private async initializePlugin(
		worker: Worker,
		manifest: PluginManifest,
		code: string,
		config?: Record<string, unknown>,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(
					new PluginError(
						PluginErrorType.TIMEOUT,
						"Plugin initialization timeout",
						manifest.id,
					),
				);
			}, 30000); // 30 second timeout

			const handleMessage = (event: MessageEvent<WorkerMessage>) => {
				if (event.data.type === "INIT") {
					clearTimeout(timeout);
					worker.removeEventListener("message", handleMessage);
					resolve();
				} else if (event.data.type === "ERROR") {
					clearTimeout(timeout);
					worker.removeEventListener("message", handleMessage);
					const errorPayload = event.data.payload as ErrorPayload;
					reject(
						new PluginError(
							PluginErrorType.INIT_FAILED,
							errorPayload.message || "Plugin initialization failed",
							manifest.id,
						),
					);
				}
			};

			worker.addEventListener("message", handleMessage);

			// Send INIT message
			const initPayload: InitPayload = {
				manifest,
				code,
				config,
			};

			const message: WorkerMessage<InitPayload> = {
				type: "INIT",
				payload: initPayload,
			};

			worker.postMessage(message);
		});
	}

	/**
	 * Dispose plugin in worker
	 *
	 * @param worker Worker instance
	 */
	private async disposePlugin(worker: Worker): Promise<void> {
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				resolve(); // Don't fail on dispose timeout
			}, 5000);

			const handleMessage = (event: MessageEvent<WorkerMessage>) => {
				if (event.data.type === "DISPOSE") {
					clearTimeout(timeout);
					worker.removeEventListener("message", handleMessage);
					resolve();
				}
			};

			worker.addEventListener("message", handleMessage);

			const message: WorkerMessage = {
				type: "DISPOSE",
				payload: {},
			};

			worker.postMessage(message);
		});
	}

	/**
	 * Handle message from worker
	 *
	 * @param pluginId Plugin ID
	 * @param message Message from worker
	 */
	private handleWorkerMessage(pluginId: string, message: WorkerMessage): void {
		switch (message.type) {
			case "API_CALL": {
				if (!message.requestId) {
					logger.error(
						{ pluginId, messageType: message.type },
						"API_CALL message missing requestId",
					);
					return;
				}
				this.handleAPICall(
					pluginId,
					message.requestId,
					message.payload as APICallPayload,
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

			case "ERROR": {
				const errorPayload = message.payload as ErrorPayload;
				const error = new Error(errorPayload.message || "Unknown error");
				if (errorPayload.stack) {
					error.stack = errorPayload.stack;
				}
				logger.error(
					{ error, pluginId, stack: errorPayload.stack },
					"Plugin error received",
				);
				const registry = getPluginRegistry();
				registry.setError(pluginId, errorPayload.message || "Unknown error");
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
	 */
	private async handleAPICall(
		pluginId: string,
		requestId: string,
		payload: APICallPayload,
	): Promise<void> {
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
			const result = await methodFn(...args);

			// Send response
			const worker = this.workers.get(pluginId);
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
			// Send error response
			const worker = this.workers.get(pluginId);
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
		}
	}

	/**
	 * Cleanup worker
	 *
	 * @param pluginId Plugin ID
	 */
	private cleanupWorker(pluginId: string): void {
		const worker = this.workers.get(pluginId);

		if (worker) {
			worker.terminate();
			this.workers.delete(pluginId);
			logger.info({ pluginId }, "Plugin worker terminated");
		}
	}

	// ========================================================================
	// Utility Methods
	// ========================================================================

	/**
	 * Get worker for plugin
	 *
	 * @param pluginId Plugin ID
	 * @returns Worker or undefined
	 */
	public getWorker(pluginId: string): Worker | undefined {
		return this.workers.get(pluginId);
	}

	/**
	 * Get all active workers
	 *
	 * @returns Map of plugin ID to worker
	 */
	public getWorkers(): Map<string, Worker> {
		return new Map(this.workers);
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get plugin loader instance
 */
export function getPluginLoader(): PluginLoader {
	return PluginLoader.getInstance();
}
