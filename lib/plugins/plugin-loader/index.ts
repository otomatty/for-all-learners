/**
 * Plugin Loader Module
 *
 * Exports all plugin loader functionality.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ app/_actions/plugins.ts
 *   └─ app/(protected)/settings/plugins/page.tsx
 *
 * Dependencies:
 *   └─ lib/plugins/plugin-loader/plugin-loader.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

export { resolveDependencies } from "./dependency-resolver";
export { validateManifest } from "./manifest-validator";
export { getPluginLoader, PluginLoader } from "./plugin-loader";
export { getSandboxWorkerCode } from "./sandbox-worker-code";
export {
	cleanupWorker,
	createWorker,
	disposePlugin,
	initializePlugin,
} from "./worker-manager";
export { handleWorkerMessage } from "./worker-message-handler";
