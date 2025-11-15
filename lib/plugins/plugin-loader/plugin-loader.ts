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
 *   ├─ lib/plugins/ai-registry.ts
 *   ├─ lib/plugins/ui-registry.ts
 *   ├─ lib/plugins/data-processor-registry.ts
 *   ├─ lib/plugins/integration-registry.ts
 *   ├─ lib/plugins/plugin-loader/manifest-validator.ts
 *   ├─ lib/plugins/plugin-loader/dependency-resolver.ts
 *   ├─ lib/plugins/plugin-loader/worker-manager.ts
 *   └─ lib/plugins/plugin-loader/worker-message-handler.ts
 *
 * Related Documentation:
 *   ├─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 *   └─ Plan: docs/03_plans/plugin-system/phase2-editor-extensions.md
 */

import logger from "@/lib/logger";
import type { LoadedPlugin, PluginManifest } from "@/types/plugin";
import * as aiRegistry from "../ai-registry";
import * as dataProcessorRegistry from "../data-processor-registry";
import { logPluginMessage } from "../debug-tools";
import { getEditorManager } from "../editor-manager";
import * as editorRegistry from "../editor-registry";
import * as integrationRegistry from "../integration-registry";
import { clearPluginCommands } from "../plugin-api";
import { getPluginExecutionMonitor } from "../plugin-execution-monitor";
import { getPluginRegistry } from "../plugin-registry";
import { getPluginSecurityAuditLogger } from "../plugin-security-audit-logger";
import type { SignatureAlgorithm } from "../plugin-signature";
import {
	PluginError,
	PluginErrorType,
	type PluginLoadOptions,
	type PluginLoadResult,
	type WorkerMessage,
} from "../types";
import * as uiRegistry from "../ui-registry";
import { resolveDependencies } from "./dependency-resolver";
import { validateManifest } from "./manifest-validator";
import {
	cleanupWorker,
	createWorker,
	disposePlugin,
	initializePlugin,
} from "./worker-manager";
import { handleWorkerMessage } from "./worker-message-handler";

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
			const validation = validateManifest(manifest);
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
			const depResolution = resolveDependencies(manifest);
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

			// Step 3.5: Verify signature (if provided)
			// Use dynamic import to avoid bundling node:crypto in client-side builds
			if (options.requireSignature || options.signature) {
				const auditLogger = getPluginSecurityAuditLogger();
				// Dynamic import to avoid bundling crypto in client-side builds
				const { verifyPluginSignatureFromDB } = await import(
					"../plugin-signature/verifier"
				);
				const verificationResult = verifyPluginSignatureFromDB(
					manifest,
					code,
					options.signature ?? null,
					options.publicKey ?? null,
					(options.signatureAlgorithm as SignatureAlgorithm | null) ?? null,
					options.signedAt ?? null,
				);

				if (!verificationResult.valid) {
					// Log verification failure
					auditLogger.logSignatureVerification(
						pluginId,
						verificationResult.error || "Unknown verification error",
						false,
					);

					if (options.requireSignature) {
						throw new PluginError(
							PluginErrorType.INVALID_SIGNATURE,
							`Plugin signature verification failed: ${verificationResult.error}`,
							pluginId,
						);
					} else {
						// If signature is provided but not required, log warning but continue
						logger.warn(
							{
								pluginId,
								error: verificationResult.error,
							},
							"Plugin signature verification failed, but signature is not required",
						);
					}
				} else {
					// Log successful verification
					auditLogger.logSignatureVerification(pluginId, null, true);
					logger.info(
						{
							pluginId,
							algorithm: verificationResult.details?.algorithm,
							codeHash: verificationResult.details?.codeHash,
						},
						"Plugin signature verified successfully",
					);
				}
			}

			// Step 4: Create Web Worker
			// Track initialization state to handle errors before registration
			let initializationFailed = false;
			let initializationError: string | null = null;

			const worker = createWorker(
				pluginId,
				(pId, msg) => this.handleWorkerMessage(pId, msg),
				(pId, msg) => {
					// Handle worker errors
					// Note: Plugin may not be registered yet, so we need to handle that case
					const reg = getPluginRegistry();
					const plugin = reg.get(pId);
					if (plugin) {
						// Plugin is registered, set error normally
						reg.setError(pId, msg);
					} else {
						// Plugin not registered yet, mark initialization as failed
						initializationFailed = true;
						initializationError = msg;
						logger.error(
							{
								pluginId: pId,
								errorMessage: msg,
								stage: "worker_creation_or_initialization",
							},
							"Worker error occurred before plugin registration",
						);
					}
				},
			);
			this.workers.set(pluginId, worker);

			// Start execution monitoring
			const executionMonitor = getPluginExecutionMonitor();
			executionMonitor.startMonitoring(pluginId, worker);

			// Step 5: Initialize plugin in worker
			// Check if initialization failed before starting
			if (initializationFailed && initializationError) {
				throw new PluginError(
					PluginErrorType.INIT_FAILED,
					`Worker error during plugin initialization: ${initializationError}`,
					pluginId,
				);
			}

			await initializePlugin(worker, manifest, code, options.config);

			// Check again after initialization (in case error occurred during init)
			if (initializationFailed && initializationError) {
				throw new PluginError(
					PluginErrorType.INIT_FAILED,
					`Worker error during plugin initialization: ${initializationError}`,
					pluginId,
				);
			}

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

			// Log to debug tools
			const debugData: Record<string, unknown> = {
				pluginId,
			};
			if (manifest.name) {
				debugData.pluginName = manifest.name;
			}
			if (manifest.version) {
				debugData.version = manifest.version;
			}
			debugData.enabled = loadedPlugin.enabled;
			debugData.hasConfig =
				!!options.config && Object.keys(options.config).length > 0;

			logPluginMessage(
				pluginId,
				"info",
				`プラグインをロードしました: ${manifest.name || pluginId} v${manifest.version || "unknown"}`,
				debugData,
			);

			return {
				success: true,
				plugin: loadedPlugin,
			};
		} catch (error) {
			// Cleanup on error
			this.cleanupWorker(pluginId);

			const message = error instanceof Error ? error.message : "Unknown error";
			const stack = error instanceof Error ? error.stack : undefined;
			const errorType = error instanceof PluginError ? error.type : undefined;

			// In browser environment, Pino may have issues serializing Error objects directly
			// Extract error properties instead of passing the error object
			const logContext: Record<string, unknown> = {
				pluginId,
				pluginName: manifest.name,
				errorMessage: message,
			};
			if (stack) {
				logContext.errorStack = stack;
			}
			if (errorType) {
				logContext.errorType = errorType;
			}
			// Add error name if available
			if (error instanceof Error && error.name) {
				logContext.errorName = error.name;
			}

			logger.error(logContext, "Failed to load plugin");

			// Log to debug tools
			const debugData: Record<string, unknown> = {
				pluginId,
			};
			if (manifest.name) {
				debugData.pluginName = manifest.name;
			}
			if (message) {
				debugData.error = message;
			}
			if (errorType) {
				debugData.errorType = errorType;
			}
			logPluginMessage(
				pluginId,
				"error",
				`プラグインのロードに失敗しました: ${message}`,
				debugData,
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
				await disposePlugin(worker);
			}

			// Step 2: Stop execution monitoring
			const executionMonitor = getPluginExecutionMonitor();
			executionMonitor.stopMonitoring(pluginId);

			// Step 3: Clear commands
			clearPluginCommands(pluginId);

			// Step 4: Clear editor extensions
			if (editorRegistry.hasExtensions(pluginId)) {
				editorRegistry.clearPlugin(pluginId);

				// Reapply extensions to all editors
				const editorManager = getEditorManager();
				editorManager.applyExtensionsToAllEditors();

				logger.info({ pluginId }, "Editor extensions cleared for plugin");
			}

			// Step 5: Clear AI extensions
			aiRegistry.clearPlugin(pluginId);
			logger.info({ pluginId }, "AI extensions cleared for plugin");

			// Step 6: Clear UI extensions
			uiRegistry.clearPlugin(pluginId);
			logger.info({ pluginId }, "UI extensions cleared for plugin");

			// Step 7: Clear Data Processor extensions
			dataProcessorRegistry.clearPlugin(pluginId);
			logger.info({ pluginId }, "Data Processor extensions cleared for plugin");

			// Step 8: Clear Integration extensions
			integrationRegistry.clearPlugin(pluginId);
			logger.info({ pluginId }, "Integration extensions cleared for plugin");

			// Step 9: Cleanup worker
			this.cleanupWorker(pluginId);

			// Step 10: Unregister from registry
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
	 * @returns Load result
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
	// Worker Message Handling
	// ========================================================================

	/**
	 * Handle message from worker
	 *
	 * @param pluginId Plugin ID
	 * @param message Message from worker
	 */
	private handleWorkerMessage(pluginId: string, message: WorkerMessage): void {
		handleWorkerMessage(pluginId, message, this.workers);
	}

	// ========================================================================
	// Worker Management
	// ========================================================================

	/**
	 * Cleanup worker
	 *
	 * @param pluginId Plugin ID
	 */
	private cleanupWorker(pluginId: string): void {
		const worker = this.workers.get(pluginId);

		if (worker) {
			cleanupWorker(worker, pluginId);
			this.workers.delete(pluginId);
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

	/**
	 * Call a plugin method
	 *
	 * @param pluginId Plugin ID
	 * @param method Method name
	 * @param args Method arguments
	 * @returns Promise that resolves with the method result
	 */
	public async callPluginMethod(
		pluginId: string,
		method: string,
		...args: unknown[]
	): Promise<unknown> {
		const worker = this.workers.get(pluginId);

		if (!worker) {
			throw new Error(`Worker not found for plugin ${pluginId}`);
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Plugin method call timeout: ${pluginId}.${method}`));
			}, 30000); // 30 second timeout

			const handleMessage = (event: MessageEvent<WorkerMessage>) => {
				const message = event.data;
				if (message.type === "CALL_METHOD") {
					clearTimeout(timeout);
					worker.removeEventListener("message", handleMessage);

					const payload = message.payload as {
						success: boolean;
						result?: unknown;
						error?: string;
					};

					if (payload.success) {
						resolve(payload.result);
					} else {
						reject(
							new Error(
								payload.error ||
									`Plugin method call failed: ${pluginId}.${method}`,
							),
						);
					}
				} else if (message.type === "ERROR") {
					clearTimeout(timeout);
					worker.removeEventListener("message", handleMessage);
					const errorPayload = message.payload as {
						message: string;
						stack?: string;
					};
					reject(
						new Error(
							errorPayload.message ||
								`Plugin method call error: ${pluginId}.${method}`,
						),
					);
				}
			};

			worker.addEventListener("message", handleMessage);

			const callMethodMessage: WorkerMessage = {
				type: "CALL_METHOD",
				payload: {
					method,
					args,
				},
			};

			worker.postMessage(callMethodMessage);
		});
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
