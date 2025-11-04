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
import { getEditorManager } from "../editor-manager";
import * as editorRegistry from "../editor-registry";
import * as integrationRegistry from "../integration-registry";
import { clearPluginCommands } from "../plugin-api";
import { getPluginExecutionMonitor } from "../plugin-execution-monitor";
import { getPluginRegistry } from "../plugin-registry";
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

			// Step 4: Create Web Worker
			const worker = createWorker(
				pluginId,
				(pId, msg) => this.handleWorkerMessage(pId, msg),
				(pId, msg) => {
					const reg = getPluginRegistry();
					reg.setError(pId, msg);
				},
			);
			this.workers.set(pluginId, worker);

			// Start execution monitoring
			const executionMonitor = getPluginExecutionMonitor();
			executionMonitor.startMonitoring(pluginId, worker);

			// Step 5: Initialize plugin in worker
			await initializePlugin(worker, manifest, code, options.config);

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
