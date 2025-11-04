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

// ============================================================================
// AI Extension Types (Phase 2)
// ============================================================================

/**
 * Question type for question generation
 */
export type QuestionType = "flashcard" | "multiple_choice" | "cloze";

/**
 * Question difficulty level
 */
export type QuestionDifficulty = "easy" | "normal" | "hard";

/**
 * Question data structure
 */
export interface QuestionData {
	type: QuestionType;
	question: string;
	answer: string;
	options?: string[]; // For multiple choice
	blanks?: string[]; // For cloze
}

/**
 * Question generator function signature
 */
export type QuestionGeneratorFunction = (
	front: string,
	back: string,
	type: QuestionType,
	difficulty?: QuestionDifficulty,
) => Promise<QuestionData>;

/**
 * Question generator extension options
 */
export interface QuestionGeneratorOptions {
	/** Unique generator ID within the plugin */
	id: string;

	/** Generator function */
	generator: QuestionGeneratorFunction;

	/** Supported question types */
	supportedTypes: QuestionType[];

	/** Generator description */
	description?: string;
}

/**
 * Prompt template variable definition
 */
export interface PromptTemplateVariable {
	name: string;
	description: string;
	required: boolean;
	default?: string;
}

/**
 * Prompt template extension options
 */
export interface PromptTemplateOptions {
	/** Unique template ID within the plugin */
	id: string;

	/** Template key (used to retrieve the template) */
	key: string;

	/** Template string (supports {{variable}} syntax) */
	template: string;

	/** Variable definitions */
	variables?: PromptTemplateVariable[];

	/** Template description */
	description?: string;
}

/**
 * Content analysis result
 */
export interface ContentAnalysisResult {
	keywords?: string[];
	summary?: string;
	entities?: Array<{ name: string; type: string }>;
	sentiment?: "positive" | "negative" | "neutral";
	confidence?: number;
	[key: string]: unknown; // Allow custom fields
}

/**
 * Content analyzer function signature
 */
export type ContentAnalyzerFunction = (
	content: string,
	options?: Record<string, unknown>,
) => Promise<ContentAnalysisResult>;

/**
 * Content analyzer extension options
 */
export interface ContentAnalyzerOptions {
	/** Unique analyzer ID within the plugin */
	id: string;

	/** Analyzer function */
	analyzer: ContentAnalyzerFunction;

	/** Analyzer description */
	description?: string;

	/** Supported options */
	options?: Array<{
		name: string;
		type: "string" | "number" | "boolean";
		description?: string;
		default?: unknown;
	}>;
}

// ============================================================================
// UI Extension Types (Phase 2)
// ============================================================================

/**
 * Widget position on dashboard
 */
export type WidgetPosition =
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right";

/**
 * Widget size
 */
export type WidgetSize = "small" | "medium" | "large";

/**
 * Widget render function - returns React component props or render data
 * Note: In Web Worker context, this returns serializable data
 */
export type WidgetRenderFunction = (
	context: WidgetContext,
) => Promise<WidgetRenderResult>;

/**
 * Widget context passed to render function
 */
export interface WidgetContext {
	/** Plugin ID */
	pluginId: string;
	/** Widget ID */
	widgetId: string;
	/** User configuration */
	config?: Record<string, unknown>;
}

/**
 * Widget render result (serializable data)
 */
export interface WidgetRenderResult {
	/** Component type identifier */
	type: string;
	/** Component props */
	props?: Record<string, unknown>;
	/** HTML content (if using HTML rendering) */
	html?: string;
}

/**
 * Widget extension options
 */
export interface WidgetOptions {
	/** Unique widget ID within the plugin */
	id: string;

	/** Widget display name */
	name: string;

	/** Widget description */
	description?: string;

	/** Widget position on dashboard */
	position: WidgetPosition;

	/** Widget size */
	size: WidgetSize;

	/** Render function */
	render: WidgetRenderFunction;

	/** Icon URL or identifier */
	icon?: string;
}

/**
 * Page route definition
 */
export interface PageRoute {
	/** Route path (e.g., "/my-plugin/page") */
	path: string;

	/** Route name */
	name: string;

	/** Page title */
	title: string;

	/** Icon URL or identifier */
	icon?: string;
}

/**
 * Page render function - returns React component props or render data
 */
export type PageRenderFunction = (
	context: PageContext,
) => Promise<PageRenderResult>;

/**
 * Page context passed to render function
 */
export interface PageContext {
	/** Plugin ID */
	pluginId: string;
	/** Page ID */
	pageId: string;
	/** Route parameters */
	params?: Record<string, string>;
	/** Query parameters */
	query?: Record<string, string>;
	/** User configuration */
	config?: Record<string, unknown>;
}

/**
 * Page render result (serializable data)
 */
export interface PageRenderResult {
	/** Component type identifier */
	type: string;
	/** Component props */
	props?: Record<string, unknown>;
	/** HTML content (if using HTML rendering) */
	html?: string;
}

/**
 * Custom page extension options
 */
export interface PageOptions {
	/** Unique page ID within the plugin */
	id: string;

	/** Page route definition */
	route: PageRoute;

	/** Render function */
	render: PageRenderFunction;

	/** Page description */
	description?: string;
}

/**
 * Sidebar panel position
 */
export type SidebarPanelPosition = "left" | "right";

/**
 * Sidebar panel render function - returns React component props or render data
 */
export type SidebarPanelRenderFunction = (
	context: SidebarPanelContext,
) => Promise<SidebarPanelRenderResult>;

/**
 * Sidebar panel context passed to render function
 */
export interface SidebarPanelContext {
	/** Plugin ID */
	pluginId: string;
	/** Panel ID */
	panelId: string;
	/** User configuration */
	config?: Record<string, unknown>;
}

/**
 * Sidebar panel render result (serializable data)
 */
export interface SidebarPanelRenderResult {
	/** Component type identifier */
	type: string;
	/** Component props */
	props?: Record<string, unknown>;
	/** HTML content (if using HTML rendering) */
	html?: string;
}

/**
 * Sidebar panel extension options
 */
export interface SidebarPanelOptions {
	/** Unique panel ID within the plugin */
	id: string;

	/** Panel display name */
	name: string;

	/** Panel description */
	description?: string;

	/** Panel position */
	position: SidebarPanelPosition;

	/** Render function */
	render: SidebarPanelRenderFunction;

	/** Icon URL or identifier */
	icon?: string;

	/** Default open state */
	defaultOpen?: boolean;
}
