/**
 * Plugin API Type Definitions
 *
 * This file contains type definitions for the F.A.L Plugin API.
 * These types are provided for TypeScript type checking and IntelliSense support.
 *
 * Note: These are type definitions only. The actual API implementation
 * is provided by the host application at runtime.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ src/index.ts (plugin entry point)
 *
 * Dependencies: None (type definitions only)
 *
 * Related Documentation:
 *   └─ Guide: docs/guides/plugin-development.md
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
 * Editor selection range
 */
export interface EditorSelection {
	from: number;
	to: number;
}

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
// Widget & Page Types
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
 * Widget render function - returns React component props or render data
 * Note: In Web Worker context, this returns serializable data
 */
export type WidgetRenderFunction = (
	context: WidgetContext,
) => Promise<WidgetRenderResult>;

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
 * Page render function - returns React component props or render data
 */
export type PageRenderFunction = (
	context: PageContext,
) => Promise<PageRenderResult>;

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
 * Sidebar panel render function - returns React component props or render data
 */
export type SidebarPanelRenderFunction = (
	context: SidebarPanelContext,
) => Promise<SidebarPanelRenderResult>;

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

// ============================================================================
// Data Processor API
// ============================================================================

/**
 * Supported data formats for import/export
 */
export type DataFormat =
	| "json"
	| "markdown"
	| "html"
	| "plain-text"
	| "csv"
	| "pdf"
	| string; // Allow custom formats

/**
 * Import result data structure
 */
export interface ImportResult {
	/** Imported data as structured format */
	data: unknown;

	/** Data format that was imported */
	format: DataFormat;

	/** Number of items imported */
	itemCount?: number;

	/** Additional metadata about the import */
	metadata?: Record<string, unknown>;
}

/**
 * Importer function signature
 */
export type ImporterFunction = (
	data: string | ArrayBuffer | Blob,
	options?: Record<string, unknown>,
) => Promise<ImportResult>;

/**
 * Importer extension options
 */
export interface ImporterOptions {
	/** Unique importer ID within the plugin */
	id: string;

	/** Importer display name */
	name: string;

	/** Importer description */
	description?: string;

	/** Supported data formats */
	supportedFormats: DataFormat[];

	/** File extensions supported (e.g., [".md", ".markdown"]) */
	fileExtensions?: string[];

	/** MIME types supported (e.g., ["text/markdown"]) */
	mimeTypes?: string[];

	/** Importer function */
	importer: ImporterFunction;

	/** Options schema for the importer */
	options?: Array<{
		name: string;
		type: "string" | "number" | "boolean";
		description?: string;
		default?: unknown;
	}>;
}

/**
 * Export result data structure
 */
export interface ExportResult {
	/** Exported data */
	data: string | ArrayBuffer | Blob;

	/** Data format that was exported */
	format: DataFormat;

	/** Suggested filename */
	filename?: string;

	/** MIME type for the exported data */
	mimeType?: string;

	/** Additional metadata about the export */
	metadata?: Record<string, unknown>;
}

/**
 * Exporter function signature
 */
export type ExporterFunction = (
	data: unknown,
	options?: Record<string, unknown>,
) => Promise<ExportResult>;

/**
 * Exporter extension options
 */
export interface ExporterOptions {
	/** Unique exporter ID within the plugin */
	id: string;

	/** Exporter display name */
	name: string;

	/** Exporter description */
	description?: string;

	/** Supported data formats */
	supportedFormats: DataFormat[];

	/** Default file extension */
	defaultExtension?: string;

	/** Default MIME type */
	defaultMimeType?: string;

	/** Exporter function */
	exporter: ExporterFunction;

	/** Options schema for the exporter */
	options?: Array<{
		name: string;
		type: "string" | "number" | "boolean";
		description?: string;
		default?: unknown;
	}>;
}

/**
 * Transform result data structure
 */
export interface TransformResult {
	/** Transformed data */
	data: unknown;

	/** Source format */
	sourceFormat: DataFormat;

	/** Target format */
	targetFormat: DataFormat;

	/** Additional metadata about the transformation */
	metadata?: Record<string, unknown>;
}

/**
 * Transformer function signature
 */
export type TransformerFunction = (
	data: unknown,
	sourceFormat: DataFormat,
	targetFormat: DataFormat,
	options?: Record<string, unknown>,
) => Promise<TransformResult>;

/**
 * Transformer extension options
 */
export interface TransformerOptions {
	/** Unique transformer ID within the plugin */
	id: string;

	/** Transformer display name */
	name: string;

	/** Transformer description */
	description?: string;

	/** Supported source formats */
	sourceFormats: DataFormat[];

	/** Supported target formats */
	targetFormats: DataFormat[];

	/** Transformer function */
	transformer: TransformerFunction;

	/** Options schema for the transformer */
	options?: Array<{
		name: string;
		type: "string" | "number" | "boolean";
		description?: string;
		default?: unknown;
	}>;
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
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
	/** Provider name (e.g., "google", "github", "custom") */
	name: string;

	/** Authorization URL */
	authorizationUrl: string;

	/** Token URL */
	tokenUrl: string;

	/** Client ID */
	clientId: string;

	/** Client secret (stored securely, not exposed to plugins) */
	clientSecret?: string;

	/** Scopes requested */
	scopes?: string[];

	/** Redirect URI */
	redirectUri?: string;

	/** Additional parameters */
	additionalParams?: Record<string, string>;
}

/**
 * OAuth token response
 */
export interface OAuthTokenResponse {
	accessToken: string;
	refreshToken?: string;
	tokenType?: string;
	expiresIn?: number;
	scope?: string;
}

/**
 * OAuth handler function signature
 */
export type OAuthHandlerFunction = (
	config: OAuthProviderConfig,
) => Promise<OAuthTokenResponse>;

/**
 * OAuth provider extension options
 */
export interface OAuthProviderOptions {
	/** Unique provider ID within the plugin */
	id: string;

	/** Provider display name */
	name: string;

	/** Provider description */
	description?: string;

	/** OAuth configuration */
	config: OAuthProviderConfig;

	/** Handler function for OAuth flow */
	handler?: OAuthHandlerFunction;

	/** Whether to use default OAuth flow (if handler is not provided) */
	useDefaultFlow?: boolean;
}

/**
 * Webhook event data
 */
export interface WebhookEventData {
	/** Event type */
	type: string;

	/** Event payload */
	payload: unknown;

	/** Timestamp */
	timestamp?: Date;

	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Webhook handler function signature
 */
export type WebhookHandlerFunction = (event: WebhookEventData) => Promise<void>;

/**
 * Webhook extension options
 */
export interface WebhookOptions {
	/** Unique webhook ID within the plugin */
	id: string;

	/** Webhook display name */
	name: string;

	/** Webhook description */
	description?: string;

	/** Webhook URL path (e.g., "/webhook/my-plugin") */
	path: string;

	/** Supported HTTP methods */
	methods?: ("GET" | "POST" | "PUT" | "DELETE" | "PATCH")[];

	/** Handler function */
	handler: WebhookHandlerFunction;

	/** Secret for webhook verification (optional) */
	secret?: string;

	/** Required headers */
	requiredHeaders?: string[];
}

/**
 * HTTP method for external API calls
 */
export type HttpMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "DELETE"
	| "PATCH"
	| "HEAD"
	| "OPTIONS";

/**
 * External API request options
 */
export interface ExternalAPIRequestOptions {
	/** Request URL */
	url: string;

	/** HTTP method */
	method?: HttpMethod;

	/** Request headers */
	headers?: Record<string, string>;

	/** Request body */
	body?: unknown;

	/** Query parameters */
	query?: Record<string, string>;

	/** Timeout in milliseconds */
	timeout?: number;

	/** Whether to use CORS proxy */
	useProxy?: boolean;

	/** Authentication token */
	authToken?: string;

	/** Additional options */
	options?: Record<string, unknown>;
}

/**
 * External API response
 */
export interface ExternalAPIResponse {
	/** Response status code */
	status: number;

	/** Response status text */
	statusText?: string;

	/** Response headers */
	headers?: Record<string, string>;

	/** Response data */
	data: unknown;

	/** Response metadata */
	metadata?: Record<string, unknown>;
}

/**
 * External API caller function signature
 */
export type ExternalAPICallerFunction = (
	options: ExternalAPIRequestOptions,
) => Promise<ExternalAPIResponse>;

/**
 * External API extension options
 */
export interface ExternalAPIOptions {
	/** Unique API ID within the plugin */
	id: string;

	/** API display name */
	name: string;

	/** API description */
	description?: string;

	/** Base URL */
	baseUrl?: string;

	/** Default headers */
	defaultHeaders?: Record<string, string>;

	/** Default timeout */
	defaultTimeout?: number;

	/** Authentication configuration */
	auth?: {
		type: "none" | "bearer" | "basic" | "apiKey";
		token?: string;
		apiKey?: string;
		apiKeyHeader?: string;
		username?: string;
		password?: string;
	};

	/** Custom caller function (optional, uses default if not provided) */
	caller?: ExternalAPICallerFunction;
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
 * Calendar extension data for a specific date
 */
export interface CalendarExtensionData {
	/** Badge text to display on calendar cell */
	badge?: string;
	/** Badge color (CSS color value or Tailwind class) */
	badgeColor?: string;
	/** Tooltip text for calendar cell */
	tooltip?: string;
	/** Detail sections for day detail panel */
	detailSections?: CalendarDetailSection[];
}

/**
 * Calendar detail section for day detail panel
 */
export interface CalendarDetailSection {
	/** Section title */
	title: string;
	/** Section content (text or structured data) */
	content: string | Record<string, unknown>;
	/** Optional icon identifier */
	icon?: string;
}

/**
 * Calendar extension options
 */
export interface CalendarExtensionOptions {
	/** Unique extension ID within the plugin */
	id: string;
	/** Extension display name */
	name: string;
	/** Extension description */
	description?: string;
	/** Function to get daily data for a specific date */
	getDailyData: (date: string) => Promise<CalendarExtensionData | null>;
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
