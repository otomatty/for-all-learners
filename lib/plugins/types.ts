/**
 * Plugin System Internal Types
 *
 * This file defines internal types used by the plugin system implementation.
 * These types are used by plugin-loader, plugin-registry, and plugin-api.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-api.ts
 *   ├─ lib/plugins/plugin-loader.ts
 *   ├─ lib/plugins/plugin-registry.ts
 *   └─ lib/plugins/sandbox-worker.ts
 *
 * Dependencies:
 *   └─ types/plugin.ts (base plugin types)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

import type {
	ExtensionPoint,
	LoadedPlugin,
	PluginManifest,
} from "@/types/plugin";

// ============================================================================
// Worker Message Protocol
// ============================================================================

/**
 * Message types for communication between host and worker
 */
export type WorkerMessageType =
	| "INIT" // Initialize plugin in worker
	| "CALL_METHOD" // Call plugin method
	| "DISPOSE" // Dispose plugin
	| "API_CALL" // Plugin calling host API
	| "API_RESPONSE" // Host responding to API call
	| "EVENT" // Plugin emitting event
	| "ERROR"; // Error occurred

/**
 * Base message structure
 */
export interface WorkerMessage<T = unknown> {
	type: WorkerMessageType;
	requestId?: string; // For request-response matching
	payload: T;
}

/**
 * INIT message payload
 */
export interface InitPayload {
	manifest: PluginManifest;
	code: string; // Plugin code as string
	config?: Record<string, unknown>; // User configuration
}

/**
 * CALL_METHOD message payload
 */
export interface CallMethodPayload {
	method: string;
	args: unknown[];
}

/**
 * API_CALL message payload (worker → host)
 */
export interface APICallPayload {
	namespace: string; // e.g., "storage", "notifications"
	method: string;
	args: unknown[];
}

/**
 * API_RESPONSE message payload (host → worker)
 */
export interface APIResponsePayload {
	success: boolean;
	result?: unknown;
	error?: string;
}

/**
 * EVENT message payload
 */
export interface EventPayload {
	eventName: string;
	data: unknown;
}

/**
 * ERROR message payload
 */
export interface ErrorPayload {
	message: string;
	stack?: string;
}

// ============================================================================
// Plugin API Types
// ============================================================================

/**
 * Command definition for UI extension
 */
export interface Command {
	id: string;
	label: string;
	description?: string;
	shortcut?: string;
	icon?: string;
	handler: () => void | Promise<void>;
}

/**
 * Dialog options for UI extension
 */
export interface DialogOptions {
	title: string;
	message?: string;
	content?: string; // HTML content
	buttons?: DialogButton[];
	width?: number;
	height?: number;
}

/**
 * Dialog button definition
 */
export interface DialogButton {
	label: string;
	variant?: "default" | "primary" | "destructive";
	onClick?: () => void | Promise<void>;
}

/**
 * Notification type
 */
export type NotificationType = "info" | "success" | "error" | "warning";

// ============================================================================
// Plugin Loader Types
// ============================================================================

/**
 * Plugin load options
 */
export interface PluginLoadOptions {
	/** User configuration for the plugin */
	config?: Record<string, unknown>;

	/** Whether to enable the plugin immediately after loading */
	enableImmediately?: boolean;

	/** Timeout for loading (ms) */
	timeout?: number;
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
	success: boolean;
	plugin?: LoadedPlugin;
	error?: string;
}

/**
 * Plugin validation result
 */
export interface PluginValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

// ============================================================================
// Plugin Registry Types
// ============================================================================

/**
 * Plugin registry filter options
 */
export interface PluginFilterOptions {
	/** Filter by extension point */
	extensionPoint?: ExtensionPoint;

	/** Filter by enabled state */
	enabled?: boolean;

	/** Search query (name, description, author) */
	query?: string;
}

/**
 * Plugin registry statistics
 */
export interface PluginRegistryStats {
	totalPlugins: number;
	enabledPlugins: number;
	disabledPlugins: number;
	pluginsByExtensionPoint: Record<ExtensionPoint, number>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Plugin error types
 */
export enum PluginErrorType {
	INVALID_MANIFEST = "INVALID_MANIFEST",
	MISSING_DEPENDENCY = "MISSING_DEPENDENCY",
	LOAD_FAILED = "LOAD_FAILED",
	INIT_FAILED = "INIT_FAILED",
	EXECUTION_FAILED = "EXECUTION_FAILED",
	API_CALL_FAILED = "API_CALL_FAILED",
	TIMEOUT = "TIMEOUT",
	SANDBOX_VIOLATION = "SANDBOX_VIOLATION",
}

/**
 * Plugin error class
 */
export class PluginError extends Error {
	constructor(
		public type: PluginErrorType,
		message: string,
		public pluginId?: string,
		public cause?: Error,
	) {
		super(message);
		this.name = "PluginError";
	}
}

// ============================================================================
// Dependency Resolution Types
// ============================================================================

/**
 * Dependency graph node
 */
export interface DependencyNode {
	pluginId: string;
	dependencies: string[];
	dependents: string[];
}

/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
	/** Load order (topological sort) */
	loadOrder: string[];

	/** Circular dependencies detected */
	circularDependencies: string[][];

	/** Missing dependencies */
	missingDependencies: Array<{
		pluginId: string;
		requiredPlugin: string;
		requiredVersion: string;
	}>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Async function type
 */
export type AsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>;

/**
 * Plugin method map
 */
export type PluginMethodMap = Record<string, AsyncFunction>;

/**
 * Plugin event listener
 */
export type PluginEventListener = (event: unknown) => void;

// ============================================================================
// Editor Extension Types (Phase 2)
// ============================================================================

/**
 * Editor extension options for plugin registration
 */
export interface EditorExtensionOptions {
	/** Unique extension ID within the plugin */
	id: string;

	/** Tiptap Extension or array of Extensions */
	extension: unknown; // Extension | Extension[] - using unknown to avoid circular dependency

	/** Extension type */
	type: "node" | "mark" | "plugin";
}

/**
 * Editor command options
 */
export interface EditorCommandOptions {
	/** Command name to execute */
	command: string;

	/** Command arguments */
	args?: unknown[];
}

/**
 * Editor selection range
 */
export interface EditorSelection {
	from: number;
	to: number;
}
