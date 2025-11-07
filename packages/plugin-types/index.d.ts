/**
 * F.A.L Plugin API Type Definitions
 *
 * This package provides TypeScript type definitions for developing plugins
 * for the F.A.L (For All Learners) application.
 *
 * Installation:
 *   npm install @fal/plugin-types
 *   # or
 *   bun add @fal/plugin-types
 *
 * Usage:
 *   import type { PluginAPI } from "@fal/plugin-types";
 *
 *   async function activate(api: PluginAPI) {
 *     // Use the API
 *   }
 *
 * @packageDocumentation
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Notification type
 */
export type NotificationType = "info" | "success" | "error" | "warning";

/**
 * JSON Content type (from Tiptap)
 */
export interface JSONContent {
	[key: string]: unknown;
}

// ============================================================================
// Application API
// ============================================================================

/**
 * Application API
 */
export interface AppAPI {
	/**
	 * Get application version
	 */
	getVersion(): string;

	/**
	 * Get application name
	 */
	getName(): string;

	/**
	 * Get current user ID (if authenticated)
	 */
	getUserId(): Promise<string | null>;
}

// ============================================================================
// Storage API
// ============================================================================

/**
 * Storage API (plugin-specific key-value storage)
 */
export interface StorageAPI {
	/**
	 * Get value from storage
	 * @param key Storage key
	 * @returns Value or undefined if not found
	 */
	get<T = unknown>(key: string): Promise<T | undefined>;

	/**
	 * Set value in storage
	 * @param key Storage key
	 * @param value Value to store (must be JSON-serializable)
	 */
	set(key: string, value: unknown): Promise<void>;

	/**
	 * Delete value from storage
	 * @param key Storage key
	 */
	delete(key: string): Promise<void>;

	/**
	 * Get all keys in storage
	 * @returns Array of keys
	 */
	keys(): Promise<string[]>;

	/**
	 * Clear all data from storage
	 */
	clear(): Promise<void>;
}

// ============================================================================
// Notifications API
// ============================================================================

/**
 * Notifications API
 */
export interface NotificationsAPI {
	/**
	 * Show notification to user
	 * @param message Notification message
	 * @param type Notification type (info, success, error, warning)
	 */
	show(message: string, type?: NotificationType): void;

	/**
	 * Show info notification
	 * @param message Message to display
	 */
	info(message: string): void;

	/**
	 * Show success notification
	 * @param message Message to display
	 */
	success(message: string): void;

	/**
	 * Show error notification
	 * @param message Message to display
	 */
	error(message: string): void;

	/**
	 * Show warning notification
	 * @param message Message to display
	 */
	warning(message: string): void;
}

// ============================================================================
// UI API
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
 * Dialog button definition
 */
export interface DialogButton {
	label: string;
	variant?: "default" | "primary" | "destructive";
	onClick?: () => void | Promise<void>;
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
 * Widget options for UI extension
 */
export interface WidgetOptions {
	id: string;
	title: string;
	description?: string;
	component: string; // Component name or path
	location?: "dashboard" | "sidebar" | "custom";
	settings?: Record<string, unknown>;
}

/**
 * Page options for UI extension
 */
export interface PageOptions {
	id: string;
	title: string;
	description?: string;
	path: string;
	component: string; // Component name or path
	icon?: string;
}

/**
 * Sidebar panel options for UI extension
 */
export interface SidebarPanelOptions {
	id: string;
	title: string;
	description?: string;
	component: string; // Component name or path
	icon?: string;
	position?: "top" | "bottom";
}

/**
 * UI API (basic functionality in Phase 1, extended in Phase 2)
 */
export interface UIAPI {
	/**
	 * Register a command that users can invoke
	 * @param command Command definition
	 */
	registerCommand(command: Command): Promise<void>;

	/**
	 * Unregister a command
	 * @param commandId Command ID to unregister
	 */
	unregisterCommand(commandId: string): Promise<void>;

	/**
	 * Show dialog to user
	 * @param options Dialog options
	 * @returns Promise that resolves when dialog is closed
	 */
	showDialog(options: DialogOptions): Promise<unknown>;

	/**
	 * Register a widget (Phase 2)
	 * @param options Widget options
	 */
	registerWidget(options: WidgetOptions): Promise<void>;

	/**
	 * Unregister a widget
	 * @param widgetId Widget ID to unregister
	 */
	unregisterWidget(widgetId: string): Promise<void>;

	/**
	 * Register a custom page (Phase 2)
	 * @param options Page options
	 */
	registerPage(options: PageOptions): Promise<void>;

	/**
	 * Unregister a custom page
	 * @param pageId Page ID to unregister
	 */
	unregisterPage(pageId: string): Promise<void>;

	/**
	 * Register a sidebar panel (Phase 2)
	 * @param options Panel options
	 */
	registerSidebarPanel(options: SidebarPanelOptions): Promise<void>;

	/**
	 * Unregister a sidebar panel
	 * @param panelId Panel ID to unregister
	 */
	unregisterSidebarPanel(panelId: string): Promise<void>;
}

// ============================================================================
// Editor API
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
 * Editor selection range
 */
export interface EditorSelection {
	from: number;
	to: number;
}

/**
 * Editor API (Phase 2)
 */
export interface EditorAPI {
	/**
	 * Register a custom Tiptap extension (Node, Mark, or Plugin)
	 * @param options Extension options
	 */
	registerExtension(options: EditorExtensionOptions): Promise<void>;

	/**
	 * Unregister an extension
	 * @param extensionId Extension ID to unregister
	 */
	unregisterExtension(extensionId: string): Promise<void>;

	/**
	 * Execute an editor command
	 * @param command Command name
	 * @param args Command arguments
	 * @returns Command result
	 */
	executeCommand(command: string, ...args: unknown[]): Promise<unknown>;

	/**
	 * Get editor content as JSON
	 * @param editorId Optional editor ID (defaults to active editor)
	 * @returns Editor content as JSONContent
	 */
	getContent(editorId?: string): Promise<JSONContent>;

	/**
	 * Set editor content
	 * @param content Content to set
	 * @param editorId Optional editor ID (defaults to active editor)
	 */
	setContent(content: JSONContent, editorId?: string): Promise<void>;

	/**
	 * Get editor selection
	 * @param editorId Optional editor ID (defaults to active editor)
	 * @returns Selection range or null if no selection
	 */
	getSelection(editorId?: string): Promise<EditorSelection | null>;

	/**
	 * Set editor selection
	 * @param from Selection start position
	 * @param to Selection end position
	 * @param editorId Optional editor ID (defaults to active editor)
	 */
	setSelection(from: number, to: number, editorId?: string): Promise<void>;

	/**
	 * Check if a command is available
	 * @param command Command name
	 * @param editorId Optional editor ID (defaults to active editor)
	 * @returns True if command can be executed
	 */
	canExecuteCommand(command: string, editorId?: string): Promise<boolean>;
}

// ============================================================================
// AI API
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
	description?: string;
	required?: boolean;
	default?: string;
}

/**
 * Prompt template options
 */
export interface PromptTemplateOptions {
	/** Unique template ID within the plugin */
	id: string;

	/** Template name */
	name: string;

	/** Template description */
	description?: string;

	/** Template content (supports variable placeholders like {{variable}}) */
	template: string;

	/** Variable definitions */
	variables?: PromptTemplateVariable[];
}

/**
 * Content analyzer options
 */
export interface ContentAnalyzerOptions {
	/** Unique analyzer ID within the plugin */
	id: string;

	/** Analyzer name */
	name: string;

	/** Analyzer description */
	description?: string;

	/** Analyzer function */
	analyzer: (content: string) => Promise<Record<string, unknown>>;
}

/**
 * AI API for plugin extensions
 */
export interface AIAPI {
	/**
	 * Register a question generator
	 * @param options Generator options
	 */
	registerQuestionGenerator(options: QuestionGeneratorOptions): Promise<void>;

	/**
	 * Unregister a question generator
	 * @param generatorId Generator ID to unregister
	 */
	unregisterQuestionGenerator(generatorId: string): Promise<void>;

	/**
	 * Register a prompt template
	 * @param options Template options
	 */
	registerPromptTemplate(options: PromptTemplateOptions): Promise<void>;

	/**
	 * Unregister a prompt template
	 * @param templateId Template ID to unregister
	 */
	unregisterPromptTemplate(templateId: string): Promise<void>;

	/**
	 * Register a content analyzer
	 * @param options Analyzer options
	 */
	registerContentAnalyzer(options: ContentAnalyzerOptions): Promise<void>;

	/**
	 * Unregister a content analyzer
	 * @param analyzerId Analyzer ID to unregister
	 */
	unregisterContentAnalyzer(analyzerId: string): Promise<void>;
}

// ============================================================================
// Data Processor API
// ============================================================================

/**
 * Importer options
 */
export interface ImporterOptions {
	/** Unique importer ID within the plugin */
	id: string;

	/** Importer name */
	name: string;

	/** Importer description */
	description?: string;

	/** Supported file extensions */
	extensions: string[];

	/** Import function */
	importer: (file: File | Blob) => Promise<JSONContent>;
}

/**
 * Exporter options
 */
export interface ExporterOptions {
	/** Unique exporter ID within the plugin */
	id: string;

	/** Exporter name */
	name: string;

	/** Exporter description */
	description?: string;

	/** File extension (e.g., "md", "txt") */
	extension: string;

	/** MIME type */
	mimeType?: string;

	/** Export function */
	exporter: (content: JSONContent) => Promise<Blob>;
}

/**
 * Transformer options
 */
export interface TransformerOptions {
	/** Unique transformer ID within the plugin */
	id: string;

	/** Transformer name */
	name: string;

	/** Transformer description */
	description?: string;

	/** Transform function */
	transformer: (content: JSONContent) => Promise<JSONContent>;
}

/**
 * Data Processor API for plugin extensions
 */
export interface DataAPI {
	/**
	 * Register an importer
	 * @param options Importer options
	 */
	registerImporter(options: ImporterOptions): Promise<void>;

	/**
	 * Unregister an importer
	 * @param importerId Importer ID to unregister
	 */
	unregisterImporter(importerId: string): Promise<void>;

	/**
	 * Register an exporter
	 * @param options Exporter options
	 */
	registerExporter(options: ExporterOptions): Promise<void>;

	/**
	 * Unregister an exporter
	 * @param exporterId Exporter ID to unregister
	 */
	unregisterExporter(exporterId: string): Promise<void>;

	/**
	 * Register a transformer
	 * @param options Transformer options
	 */
	registerTransformer(options: TransformerOptions): Promise<void>;

	/**
	 * Unregister a transformer
	 * @param transformerId Transformer ID to unregister
	 */
	unregisterTransformer(transformerId: string): Promise<void>;
}

// ============================================================================
// Integration API
// ============================================================================

/**
 * OAuth provider options
 */
export interface OAuthProviderOptions {
	/** Unique provider ID within the plugin */
	id: string;

	/** Provider name */
	name: string;

	/** Provider description */
	description?: string;

	/** Authorization URL */
	authorizationUrl: string;

	/** Token URL */
	tokenUrl: string;

	/** Client ID */
	clientId: string;

	/** Client secret (optional, stored securely) */
	clientSecret?: string;

	/** Scopes */
	scopes?: string[];

	/** Redirect URI */
	redirectUri?: string;
}

/**
 * Webhook options
 */
export interface WebhookOptions {
	/** Unique webhook ID within the plugin */
	id: string;

	/** Webhook name */
	name: string;

	/** Webhook description */
	description?: string;

	/** Webhook path (e.g., "/webhook/my-plugin") */
	path: string;

	/** HTTP methods (e.g., ["POST", "GET"]) */
	methods?: string[];

	/** Webhook handler function */
	handler: (event: {
		type: string;
		payload: unknown;
		timestamp?: Date;
		metadata?: Record<string, unknown>;
	}) => Promise<void>;
}

/**
 * External API options
 */
export interface ExternalAPIOptions {
	/** Unique API ID within the plugin */
	id: string;

	/** API name */
	name: string;

	/** API description */
	description?: string;

	/** Base URL */
	baseUrl: string;

	/** Default headers */
	defaultHeaders?: Record<string, string>;
}

/**
 * External API request options
 */
export interface ExternalAPIRequestOptions {
	/** HTTP method */
	method: string;

	/** Request URL (relative to baseUrl if apiId is provided) */
	url: string;

	/** Request headers */
	headers?: Record<string, string>;

	/** Request body */
	body?: unknown;
}

/**
 * External API response
 */
export interface ExternalAPIResponse {
	/** Response status code */
	status: number;

	/** Response headers */
	headers: Record<string, string>;

	/** Response body */
	body: unknown;
}

/**
 * Integration API for plugin extensions
 */
export interface IntegrationAPI {
	/**
	 * Register an OAuth provider
	 * @param options OAuth provider options
	 */
	registerOAuthProvider(options: OAuthProviderOptions): Promise<void>;

	/**
	 * Unregister an OAuth provider
	 * @param providerId Provider ID to unregister
	 */
	unregisterOAuthProvider(providerId: string): Promise<void>;

	/**
	 * Register a webhook
	 * @param options Webhook options
	 */
	registerWebhook(options: WebhookOptions): Promise<void>;

	/**
	 * Unregister a webhook
	 * @param webhookId Webhook ID to unregister
	 */
	unregisterWebhook(webhookId: string): Promise<void>;

	/**
	 * Register an external API
	 * @param options External API options
	 */
	registerExternalAPI(options: ExternalAPIOptions): Promise<void>;

	/**
	 * Unregister an external API
	 * @param apiId API ID to unregister
	 */
	unregisterExternalAPI(apiId: string): Promise<void>;

	/**
	 * Call an external API
	 * @param apiId API ID (optional, if not provided, uses default caller)
	 * @param options Request options
	 * @returns API response
	 */
	callExternalAPI(
		apiId: string | undefined,
		options: ExternalAPIRequestOptions,
	): Promise<ExternalAPIResponse>;
}

// ============================================================================
// Calendar API
// ============================================================================

/**
 * Calendar extension options
 */
export interface CalendarExtensionOptions {
	/** Unique extension ID within the plugin */
	id: string;

	/** Extension name */
	name: string;

	/** Extension description */
	description?: string;

	/** Data provider function */
	dataProvider: (date: Date) => Promise<{
		value?: number;
		label?: string;
		tooltip?: string;
		badge?: string;
		details?: Record<string, unknown>;
	} | null>;
}

/**
 * Calendar API for plugin extensions
 */
export interface CalendarAPI {
	/**
	 * Register a calendar extension
	 * @param options Calendar extension options
	 */
	registerExtension(options: CalendarExtensionOptions): Promise<void>;

	/**
	 * Unregister a calendar extension
	 * @param extensionId Extension ID to unregister
	 */
	unregisterExtension(extensionId: string): Promise<void>;
}

// ============================================================================
// Main Plugin API
// ============================================================================

/**
 * Main API interface exposed to plugins
 *
 * This is the API that plugins can use to interact with the host application.
 * All methods are async and communicate via postMessage when in Web Worker context.
 */
export interface PluginAPI {
	/** Application information */
	app: AppAPI;

	/** Plugin-specific storage */
	storage: StorageAPI;

	/** Notification system */
	notifications: NotificationsAPI;

	/** UI extensions (basic functionality in Phase 1) */
	ui: UIAPI;

	/** Editor extensions (Phase 2) */
	editor: EditorAPI;

	/** AI extensions (Phase 2) */
	ai: AIAPI;

	/** Data processor extensions (Phase 2) */
	data: DataAPI;

	/** Integration extensions (Phase 2) */
	integration: IntegrationAPI;

	/** Calendar extensions (Phase 2) */
	calendar: CalendarAPI;
}

// ============================================================================
// Plugin Activation Function
// ============================================================================

/**
 * Plugin activation function
 *
 * This is the entry point for all plugins. It receives the PluginAPI instance
 * and optional user configuration.
 *
 * @param api Plugin API instance
 * @param config User configuration (optional)
 * @returns Plugin instance with optional methods and dispose function
 */
export type PluginActivateFunction = (
	api: PluginAPI,
	config?: Record<string, unknown>,
) => Promise<{
	/** Optional methods exposed by the plugin */
	methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;

	/** Cleanup function called when plugin is deactivated */
	dispose?: () => void | Promise<void>;
}>;
