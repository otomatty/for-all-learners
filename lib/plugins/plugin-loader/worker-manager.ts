/**
 * Worker Manager
 *
 * Manages Web Worker lifecycle: creation, initialization, disposal, and cleanup.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-loader/plugin-loader.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-loader/sandbox-worker-code.ts
 *   ├─ lib/plugins/types.ts
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

import logger from "@/lib/logger";
import type { PluginManifest } from "@/types/plugin";
import type { ErrorPayload, InitPayload, WorkerMessage } from "../types";
import { PluginError, PluginErrorType } from "../types";
import { getSandboxWorkerCode } from "./sandbox-worker-code";

/**
 * Create Web Worker for plugin
 *
 * @param pluginId Plugin ID
 * @param onMessage Message handler callback
 * @param onError Error handler callback
 * @returns Worker instance
 */
export function createWorker(
	pluginId: string,
	onMessage: (pluginId: string, message: WorkerMessage) => void,
	onError: (pluginId: string, message: string) => void,
): Worker {
	// Create worker from inline sandbox worker code
	// Note: In production, this should be loaded from a separate file
	// For now, we'll create a blob URL with the worker code
	const workerCode = getSandboxWorkerCode();

	const blob = new Blob([workerCode], { type: "application/javascript" });
	const workerUrl = URL.createObjectURL(blob);

	const worker = new Worker(workerUrl, {
		type: "classic", // Use classic mode for simpler execution
		name: `plugin-${pluginId}`,
	});

	// Set up message handler
	worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
		onMessage(pluginId, event.data);
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
		onError(pluginId, error.message);
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
 * Initialize plugin in worker
 *
 * @param worker Worker instance
 * @param manifest Plugin manifest
 * @param code Plugin code
 * @param config User configuration
 */
export async function initializePlugin(
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
export async function disposePlugin(worker: Worker): Promise<void> {
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
 * Cleanup worker
 *
 * @param worker Worker instance
 * @param pluginId Plugin ID
 */
export function cleanupWorker(worker: Worker, pluginId: string): void {
	worker.terminate();
	logger.info({ pluginId }, "Plugin worker terminated");
}
