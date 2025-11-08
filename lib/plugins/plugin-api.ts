/**
 * Plugin API Implementation
 *
 * This file implements the API that plugins can use to interact with the host application.
 * All API calls from plugins are proxied through Web Workers for security.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-loader/index.ts
 *   └─ lib/plugins/sandbox-worker.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/types.ts
 *   ├─ lib/plugins/editor-registry.ts
 *   ├─ lib/plugins/editor-manager.ts
 *   ├─ types/plugin.ts
 *   └─ app/_actions/plugin-storage.ts (via dynamic import)
 *
 * Related Documentation:
 *   ├─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 *   └─ Plan: docs/03_plans/plugin-system/phase2-editor-extensions.md
 */

import type { JSONContent } from "@tiptap/core";
import logger from "@/lib/logger";
// Import package.json for version information
import pkg from "../../package.json";
import * as aiRegistry from "./ai-registry";
import * as calendarRegistry from "./calendar-registry";
import * as dataProcessorRegistry from "./data-processor-registry";
import { logPluginMessage } from "./debug-tools";
import { getEditorManager } from "./editor-manager";
import * as editorRegistry from "./editor-registry";
import * as integrationRegistry from "./integration-registry";
import { getPluginRateLimiter } from "./plugin-rate-limiter";
import { getPluginSecurityAuditLogger } from "./plugin-security-audit-logger";
import type {
	CalendarExtensionOptions,
	Command,
	ContentAnalyzerOptions,
	DialogOptions,
	EditorExtensionOptions,
	EditorSelection,
	ExporterOptions,
	ExternalAPIOptions,
	ExternalAPIRequestOptions,
	ExternalAPIResponse,
	ImporterOptions,
	NotificationType,
	OAuthProviderOptions,
	PageOptions,
	PromptTemplateOptions,
	QuestionGeneratorOptions,
	SidebarPanelOptions,
	TransformerOptions,
	WebhookOptions,
	WidgetOptions,
} from "./types";
import * as uiRegistry from "./ui-registry";
// ============================================================================
// Plugin API Interface
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
// Plugin API Implementation (Host-side)
// ============================================================================

/**
 * Create Plugin API instance for host-side usage
 *
 * This creates the actual implementation of the API that will handle
 * plugin requests from Web Workers.
 *
 * @param pluginId Plugin ID making the API call
 * @returns Plugin API instance
 */
export function createPluginAPI(pluginId: string): PluginAPI {
	return {
		app: createAppAPI(),
		storage: createStorageAPI(pluginId),
		notifications: createNotificationsAPI(pluginId),
		ui: createUIAPI(pluginId),
		editor: createEditorAPI(pluginId),
		ai: createAIAPI(pluginId),
		data: createDataAPI(pluginId),
		integration: createIntegrationAPI(pluginId),
		calendar: createCalendarAPI(pluginId),
	};
}

/**
 * Create App API implementation
 */
function createAppAPI(): AppAPI {
	return {
		getVersion(): string {
			// Get version from package.json
			return pkg.version;
		},

		getName(): string {
			return "F.A.L (For All Learners)";
		},

		async getUserId(): Promise<string | null> {
			// TODO: Get current user from Supabase auth
			// This will be implemented when integrating with auth system
			return null;
		},
	};
}

/**
 * Create Storage API implementation
 *
 * @param pluginId Plugin ID for storage isolation
 */
function createStorageAPI(pluginId: string): StorageAPI {
	const rateLimiter = getPluginRateLimiter();
	const auditLogger = getPluginSecurityAuditLogger();

	return {
		async get<T = unknown>(key: string): Promise<T | undefined> {
			try {
				// Log storage access
				auditLogger.logStorageAccess(pluginId, "get", undefined, key);

				// Dynamic import to avoid circular dependencies
				const { getPluginStorage } = await import(
					"@/app/_actions/plugin-storage"
				);
				const result = await getPluginStorage(pluginId, key);
				return result as T | undefined;
			} catch (error) {
				logger.error(
					{ error, pluginId, key, operation: "get" },
					"Plugin storage get failed",
				);
				return undefined;
			}
		},

		async set(key: string, value: unknown): Promise<void> {
			try {
				// Check storage quota before setting
				// Estimate size by JSON stringifying (approximate)
				const estimatedSize = new Blob([JSON.stringify(value)]).size;

				// TODO: Get actual userId from plugin context when available
				const quotaCheck = rateLimiter.checkStorageQuota(
					pluginId,
					undefined,
					estimatedSize,
				);

				if (!quotaCheck.allowed) {
					// Log storage quota exceeded
					const maxQuota = 10 * 1024 * 1024; // 10MB default
					auditLogger.logStorageAccess(
						pluginId,
						"set",
						undefined,
						key,
						estimatedSize,
						maxQuota,
					);
					throw new Error(quotaCheck.reason || "Storage quota exceeded");
				}

				const { setPluginStorage } = await import(
					"@/app/_actions/plugin-storage"
				);
				await setPluginStorage(pluginId, key, value);

				// Log storage access
				auditLogger.logStorageAccess(
					pluginId,
					"set",
					undefined,
					key,
					estimatedSize,
				);

				// Update storage usage tracking
				// Note: This is approximate. For accurate tracking, query database
				// TODO: Get actual storage size from database and update rate limiter
			} catch (error) {
				logger.error(
					{ error, pluginId, key, operation: "set" },
					"Plugin storage set failed",
				);
				throw new Error(`Failed to set storage value: ${error}`);
			}
		},

		async delete(key: string): Promise<void> {
			try {
				// Log storage access
				auditLogger.logStorageAccess(pluginId, "delete", undefined, key);

				const { deletePluginStorage } = await import(
					"@/app/_actions/plugin-storage"
				);
				await deletePluginStorage(pluginId, key);

				// Note: Storage usage tracking would need to be updated here
				// For accurate tracking, query database after deletion
				// TODO: Update storage usage tracking after deletion
			} catch (error) {
				logger.error(
					{ error, pluginId, key, operation: "delete" },
					"Plugin storage delete failed",
				);
				throw new Error(`Failed to delete storage value: ${error}`);
			}
		},

		async keys(): Promise<string[]> {
			try {
				// Log storage access
				auditLogger.logStorageAccess(pluginId, "keys");

				const { getPluginStorageKeys } = await import(
					"@/app/_actions/plugin-storage"
				);
				return await getPluginStorageKeys(pluginId);
			} catch (error) {
				logger.error(
					{ error, pluginId, operation: "keys" },
					"Plugin storage keys failed",
				);
				return [];
			}
		},

		async clear(): Promise<void> {
			try {
				// Log storage access
				auditLogger.logStorageAccess(pluginId, "clear");

				const { clearPluginStorage } = await import(
					"@/app/_actions/plugin-storage"
				);
				await clearPluginStorage(pluginId);

				// Reset storage usage tracking
				rateLimiter.recordStorageUsage(pluginId, undefined, 0);
			} catch (error) {
				logger.error(
					{ error, pluginId, operation: "clear" },
					"Plugin storage clear failed",
				);
				throw new Error(`Failed to clear storage: ${error}`);
			}
		},
	};
}

/**
 * Create Notifications API implementation
 *
 * @param pluginId Plugin ID for logging/tracking
 */
function createNotificationsAPI(pluginId: string): NotificationsAPI {
	return {
		show(message: string, type: NotificationType = "info"): void {
			// Use sonner toast for notifications
			if (typeof window !== "undefined") {
				// Dynamic import sonner to avoid SSR issues
				import("sonner").then(({ toast }) => {
					const prefixedMessage = `[${pluginId}] ${message}`;

					switch (type) {
						case "success":
							toast.success(prefixedMessage);
							break;
						case "error":
							toast.error(prefixedMessage);
							break;
						case "warning":
							toast.warning(prefixedMessage);
							break;
						default:
							toast.info(prefixedMessage);
							break;
					}
				});
			}
		},

		info(message: string): void {
			this.show(message, "info");
		},

		success(message: string): void {
			this.show(message, "success");
		},

		error(message: string): void {
			this.show(message, "error");
		},

		warning(message: string): void {
			this.show(message, "warning");
		},
	};
}

/**
 * Command registry (global state)
 */
const commandRegistry = new Map<string, Command>();

/**
 * Create UI API implementation
 *
 * @param pluginId Plugin ID for command registration
 */
function createUIAPI(pluginId: string): UIAPI {
	return {
		async registerCommand(command: Command): Promise<void> {
			const fullCommandId = `${pluginId}.${command.id}`;

			if (commandRegistry.has(fullCommandId)) {
				throw new Error(`Command ${fullCommandId} is already registered`);
			}

			commandRegistry.set(fullCommandId, {
				...command,
				id: fullCommandId,
			});

			logger.info(
				{ pluginId, commandId: fullCommandId, commandLabel: command.label },
				"Plugin command registered",
			);

			// Log to debug tools
			logPluginMessage(
				pluginId,
				"info",
				`コマンドを登録: ${command.label || command.id} (${command.id})`,
				{
					commandId: fullCommandId,
					commandLabel: command.label,
					description: command.description,
					icon: command.icon,
				},
			);
		},

		async unregisterCommand(commandId: string): Promise<void> {
			const fullCommandId = `${pluginId}.${commandId}`;

			if (!commandRegistry.has(fullCommandId)) {
				logger.warn(
					{ pluginId, commandId: fullCommandId },
					"Plugin command not registered",
				);
				return;
			}

			commandRegistry.delete(fullCommandId);
			logger.info(
				{ pluginId, commandId: fullCommandId },
				"Plugin command unregistered",
			);
		},

		async showDialog(options: DialogOptions): Promise<unknown> {
			// TODO: Implement dialog system
			// For Phase 1, we'll use window.confirm/alert as fallback
			if (typeof window !== "undefined") {
				const message = `${options.title}\n\n${options.message || ""}`;

				if (options.buttons && options.buttons.length > 0) {
					// Simple confirm dialog for buttons
					const confirmed = window.confirm(message);
					return confirmed ? options.buttons[0] : options.buttons[1];
				}

				window.alert(message);
				return undefined;
			}

			return undefined;
		},

		async registerWidget(options: WidgetOptions): Promise<void> {
			try {
				// Register widget (render function will be handled by ui-registry for Worker context)
				uiRegistry.registerWidget(pluginId, options);
				logger.info(
					{
						pluginId,
						widgetId: options.id,
						position: options.position,
						size: options.size,
					},
					"Widget registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, widgetId: options.id },
					"Failed to register widget",
				);
				throw error;
			}
		},

		async unregisterWidget(widgetId: string): Promise<void> {
			try {
				uiRegistry.unregisterWidget(pluginId, widgetId);
				logger.info({ pluginId, widgetId }, "Widget unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, widgetId },
					"Failed to unregister widget",
				);
				throw error;
			}
		},

		async registerPage(options: PageOptions): Promise<void> {
			try {
				uiRegistry.registerPage(pluginId, options);
				logger.info(
					{ pluginId, pageId: options.id, route: options.route.path },
					"Page registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, pageId: options.id },
					"Failed to register page",
				);
				throw error;
			}
		},

		async unregisterPage(pageId: string): Promise<void> {
			try {
				uiRegistry.unregisterPage(pluginId, pageId);
				logger.info({ pluginId, pageId }, "Page unregistered");
			} catch (error) {
				logger.error({ error, pluginId, pageId }, "Failed to unregister page");
				throw error;
			}
		},

		async registerSidebarPanel(options: SidebarPanelOptions): Promise<void> {
			try {
				uiRegistry.registerSidebarPanel(pluginId, options);
				logger.info(
					{
						pluginId,
						panelId: options.id,
						position: options.position,
					},
					"Sidebar panel registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, panelId: options.id },
					"Failed to register sidebar panel",
				);
				throw error;
			}
		},

		async unregisterSidebarPanel(panelId: string): Promise<void> {
			try {
				uiRegistry.unregisterSidebarPanel(pluginId, panelId);
				logger.info({ pluginId, panelId }, "Sidebar panel unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, panelId },
					"Failed to unregister sidebar panel",
				);
				throw error;
			}
		},
	};
}

/**
 * Get all registered commands
 * @returns Map of command ID to command
 */
export function getRegisteredCommands(): Map<string, Command> {
	return new Map(commandRegistry);
}

/**
 * Execute a registered command
 * @param commandId Full command ID (pluginId.commandId)
 */
export async function executeCommand(commandId: string): Promise<void> {
	const command = commandRegistry.get(commandId);

	if (!command) {
		throw new Error(`Command ${commandId} is not registered`);
	}

	await command.handler();
}

/**
 * Clear all commands from a specific plugin
 * @param pluginId Plugin ID
 */
export function clearPluginCommands(pluginId: string): void {
	const keysToDelete: string[] = [];

	for (const [commandId] of commandRegistry) {
		if (commandId.startsWith(`${pluginId}.`)) {
			keysToDelete.push(commandId);
		}
	}

	for (const key of keysToDelete) {
		commandRegistry.delete(key);
	}

	if (keysToDelete.length > 0) {
		logger.info(
			{ pluginId, commandCount: keysToDelete.length },
			"Plugin commands cleared",
		);
	}
}

/**
 * Create Editor API implementation
 *
 * @param pluginId Plugin ID for extension registration
 */
function createEditorAPI(pluginId: string): EditorAPI {
	const manager = getEditorManager();

	return {
		async registerExtension(options: EditorExtensionOptions): Promise<void> {
			try {
				editorRegistry.register(pluginId, options);

				// Note: TipTap does not support dynamic extension updates after editor initialization.
				// New plugin extensions will only be available for newly created editors.
				// Existing editors must be recreated to use new extensions.
				// The deprecated applyExtensionsToAllEditors() method is not called because it does nothing.

				logger.info(
					{ pluginId, extensionId: options.id, type: options.type },
					"Editor extension registered. " +
						"Note: This extension will only be available for newly created editors. " +
						"Existing editors must be recreated to use this extension.",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, extensionId: options.id },
					"Failed to register editor extension",
				);
				throw error;
			}
		},

		async unregisterExtension(extensionId: string): Promise<void> {
			try {
				editorRegistry.unregister(pluginId, extensionId);

				// Note: TipTap does not support dynamic extension updates after editor initialization.
				// Extension removal will only affect newly created editors.
				// Existing editors will continue to use the extension until recreated.
				// The deprecated applyExtensionsToAllEditors() method is not called because it does nothing.

				logger.info(
					{ pluginId, extensionId },
					"Editor extension unregistered. " +
						"Note: This extension will still be available in existing editors until they are recreated.",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, extensionId },
					"Failed to unregister editor extension",
				);
				throw error;
			}
		},

		async executeCommand(
			command: string,
			...args: unknown[]
		): Promise<unknown> {
			try {
				return await manager.executeCommand(undefined, command, ...args);
			} catch (error) {
				logger.error(
					{ error, pluginId, command, args },
					"Failed to execute editor command",
				);
				throw error;
			}
		},

		async getContent(editorId?: string): Promise<JSONContent> {
			try {
				return await manager.getContent(editorId);
			} catch (error) {
				logger.error(
					{ error, pluginId, editorId },
					"Failed to get editor content",
				);
				throw error;
			}
		},

		async setContent(content: JSONContent, editorId?: string): Promise<void> {
			try {
				await manager.setContent(editorId, content);
			} catch (error) {
				logger.error(
					{ error, pluginId, editorId },
					"Failed to set editor content",
				);
				throw error;
			}
		},

		async getSelection(editorId?: string): Promise<EditorSelection | null> {
			try {
				return await manager.getSelection(editorId);
			} catch (error) {
				logger.error(
					{ error, pluginId, editorId },
					"Failed to get editor selection",
				);
				throw error;
			}
		},

		async setSelection(
			from: number,
			to: number,
			editorId?: string,
		): Promise<void> {
			try {
				await manager.setSelection(editorId, from, to);
			} catch (error) {
				logger.error(
					{ error, pluginId, editorId, from, to },
					"Failed to set editor selection",
				);
				throw error;
			}
		},

		async canExecuteCommand(
			command: string,
			editorId?: string,
		): Promise<boolean> {
			try {
				return await manager.canExecuteCommand(editorId, command);
			} catch (error) {
				logger.error(
					{ error, pluginId, command, editorId },
					"Failed to check command availability",
				);
				return false;
			}
		},
	};
}

/**
 * Create AI API implementation
 *
 * @param pluginId Plugin ID for API calls
 * @returns AI API instance
 */
function createAIAPI(pluginId: string): AIAPI {
	return {
		async registerQuestionGenerator(
			options: QuestionGeneratorOptions,
		): Promise<void> {
			try {
				aiRegistry.registerQuestionGenerator(pluginId, options);
				logger.info(
					{
						pluginId,
						generatorId: options.id,
						supportedTypes: options.supportedTypes,
					},
					"Question generator registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, generatorId: options.id },
					"Failed to register question generator",
				);
				throw error;
			}
		},

		async unregisterQuestionGenerator(generatorId: string): Promise<void> {
			try {
				aiRegistry.unregisterQuestionGenerator(pluginId, generatorId);
				logger.info(
					{ pluginId, generatorId },
					"Question generator unregistered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, generatorId },
					"Failed to unregister question generator",
				);
				throw error;
			}
		},

		async registerPromptTemplate(
			options: PromptTemplateOptions,
		): Promise<void> {
			try {
				aiRegistry.registerPromptTemplate(pluginId, options);
				logger.info(
					{ pluginId, templateId: options.id, key: options.key },
					"Prompt template registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, templateId: options.id },
					"Failed to register prompt template",
				);
				throw error;
			}
		},

		async unregisterPromptTemplate(templateId: string): Promise<void> {
			try {
				aiRegistry.unregisterPromptTemplate(pluginId, templateId);
				logger.info({ pluginId, templateId }, "Prompt template unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, templateId },
					"Failed to unregister prompt template",
				);
				throw error;
			}
		},

		async registerContentAnalyzer(
			options: ContentAnalyzerOptions,
		): Promise<void> {
			try {
				aiRegistry.registerContentAnalyzer(pluginId, options);
				logger.info(
					{ pluginId, analyzerId: options.id },
					"Content analyzer registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, analyzerId: options.id },
					"Failed to register content analyzer",
				);
				throw error;
			}
		},

		async unregisterContentAnalyzer(analyzerId: string): Promise<void> {
			try {
				aiRegistry.unregisterContentAnalyzer(pluginId, analyzerId);
				logger.info({ pluginId, analyzerId }, "Content analyzer unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, analyzerId },
					"Failed to unregister content analyzer",
				);
				throw error;
			}
		},
	};
}

/**
 * Create Data Processor API implementation
 *
 * @param pluginId Plugin ID for API calls
 * @returns Data API instance
 */
function createDataAPI(pluginId: string): DataAPI {
	return {
		async registerImporter(options: ImporterOptions): Promise<void> {
			try {
				dataProcessorRegistry.registerImporter(pluginId, options);
				logger.info(
					{
						pluginId,
						importerId: options.id,
						name: options.name,
						supportedFormats: options.supportedFormats,
					},
					"Importer registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, importerId: options.id },
					"Failed to register importer",
				);
				throw error;
			}
		},

		async unregisterImporter(importerId: string): Promise<void> {
			try {
				dataProcessorRegistry.unregisterImporter(pluginId, importerId);
				logger.info({ pluginId, importerId }, "Importer unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, importerId },
					"Failed to unregister importer",
				);
				throw error;
			}
		},

		async registerExporter(options: ExporterOptions): Promise<void> {
			try {
				dataProcessorRegistry.registerExporter(pluginId, options);
				logger.info(
					{
						pluginId,
						exporterId: options.id,
						name: options.name,
						supportedFormats: options.supportedFormats,
					},
					"Exporter registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, exporterId: options.id },
					"Failed to register exporter",
				);
				throw error;
			}
		},

		async unregisterExporter(exporterId: string): Promise<void> {
			try {
				dataProcessorRegistry.unregisterExporter(pluginId, exporterId);
				logger.info({ pluginId, exporterId }, "Exporter unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, exporterId },
					"Failed to unregister exporter",
				);
				throw error;
			}
		},

		async registerTransformer(options: TransformerOptions): Promise<void> {
			try {
				dataProcessorRegistry.registerTransformer(pluginId, options);
				logger.info(
					{
						pluginId,
						transformerId: options.id,
						name: options.name,
						sourceFormats: options.sourceFormats,
						targetFormats: options.targetFormats,
					},
					"Transformer registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, transformerId: options.id },
					"Failed to register transformer",
				);
				throw error;
			}
		},

		async unregisterTransformer(transformerId: string): Promise<void> {
			try {
				dataProcessorRegistry.unregisterTransformer(pluginId, transformerId);
				logger.info({ pluginId, transformerId }, "Transformer unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, transformerId },
					"Failed to unregister transformer",
				);
				throw error;
			}
		},
	};
}

/**
 * Create Integration API implementation
 *
 * @param pluginId Plugin ID for API calls
 * @returns Integration API instance
 */
function createIntegrationAPI(pluginId: string): IntegrationAPI {
	return {
		async registerOAuthProvider(options: OAuthProviderOptions): Promise<void> {
			try {
				integrationRegistry.registerOAuthProvider(pluginId, options);
				logger.info(
					{
						pluginId,
						providerId: options.id,
						name: options.name,
					},
					"OAuth provider registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, providerId: options.id },
					"Failed to register OAuth provider",
				);
				throw error;
			}
		},

		async unregisterOAuthProvider(providerId: string): Promise<void> {
			try {
				integrationRegistry.unregisterOAuthProvider(pluginId, providerId);
				logger.info({ pluginId, providerId }, "OAuth provider unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, providerId },
					"Failed to unregister OAuth provider",
				);
				throw error;
			}
		},

		async registerWebhook(options: WebhookOptions): Promise<void> {
			try {
				integrationRegistry.registerWebhook(pluginId, options);
				logger.info(
					{
						pluginId,
						webhookId: options.id,
						path: options.path,
						methods: options.methods,
					},
					"Webhook registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, webhookId: options.id },
					"Failed to register webhook",
				);
				throw error;
			}
		},

		async unregisterWebhook(webhookId: string): Promise<void> {
			try {
				integrationRegistry.unregisterWebhook(pluginId, webhookId);
				logger.info({ pluginId, webhookId }, "Webhook unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, webhookId },
					"Failed to unregister webhook",
				);
				throw error;
			}
		},

		async registerExternalAPI(options: ExternalAPIOptions): Promise<void> {
			try {
				integrationRegistry.registerExternalAPI(pluginId, options);
				logger.info(
					{
						pluginId,
						apiId: options.id,
						name: options.name,
						baseUrl: options.baseUrl,
					},
					"External API registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, apiId: options.id },
					"Failed to register external API",
				);
				throw error;
			}
		},

		async unregisterExternalAPI(apiId: string): Promise<void> {
			try {
				integrationRegistry.unregisterExternalAPI(pluginId, apiId);
				logger.info({ pluginId, apiId }, "External API unregistered");
			} catch (error) {
				logger.error(
					{ error, pluginId, apiId },
					"Failed to unregister external API",
				);
				throw error;
			}
		},

		async callExternalAPI(
			apiId: string | undefined,
			options: ExternalAPIRequestOptions,
		): Promise<ExternalAPIResponse> {
			try {
				// If apiId is provided, use registered API configuration
				if (apiId) {
					const apiEntry = integrationRegistry.getExternalAPI(pluginId, apiId);
					if (!apiEntry) {
						throw new Error(`External API ${apiId} not found`);
					}

					// Merge base URL if provided
					const url = apiEntry.baseUrl
						? `${apiEntry.baseUrl}${options.url}`
						: options.url;

					// Merge headers
					const headers = {
						...apiEntry.defaultHeaders,
						...options.headers,
					};

					// Add authentication headers if configured
					if (apiEntry.auth) {
						if (apiEntry.auth.type === "bearer" && apiEntry.auth.token) {
							headers.Authorization = `Bearer ${apiEntry.auth.token}`;
						} else if (
							apiEntry.auth.type === "apiKey" &&
							apiEntry.auth.apiKey &&
							apiEntry.auth.apiKeyHeader
						) {
							headers[apiEntry.auth.apiKeyHeader] = apiEntry.auth.apiKey;
						} else if (
							apiEntry.auth.type === "basic" &&
							apiEntry.auth.username &&
							apiEntry.auth.password
						) {
							const credentials = btoa(
								`${apiEntry.auth.username}:${apiEntry.auth.password}`,
							);
							headers.Authorization = `Basic ${credentials}`;
						}
					}

					// Use custom caller if provided, otherwise use default
					if (apiEntry.caller) {
						return await apiEntry.caller({
							...options,
							url,
							headers,
							timeout: options.timeout ?? apiEntry.defaultTimeout,
						});
					}

					// Default HTTP caller implementation
					return await defaultHTTPCaller({
						...options,
						url,
						headers,
						timeout: options.timeout ?? apiEntry.defaultTimeout,
					});
				}

				// Use default caller if no apiId provided
				return await defaultHTTPCaller(options);
			} catch (error) {
				logger.error(
					{ error, pluginId, apiId, url: options.url },
					"Failed to call external API",
				);
				throw error;
			}
		},
	};
}

/**
 * Default HTTP caller implementation
 *
 * @param options Request options
 * @returns API response
 */
async function defaultHTTPCaller(
	options: ExternalAPIRequestOptions,
): Promise<ExternalAPIResponse> {
	const method = options.method ?? "GET";

	// Build URL - handle relative URLs
	let urlString = options.url;
	if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
		// Relative URL - use proxy if needed or construct absolute URL
		if (options.useProxy && typeof window !== "undefined") {
			// Validate URL before passing to proxy to prevent open redirect attacks
			try {
				// Try to parse as URL to validate format
				const testUrl = new URL(urlString, window.location.origin);
				// Only allow relative URLs, not absolute URLs that could be used for redirects
				if (testUrl.origin !== window.location.origin) {
					throw new Error("Invalid URL: cannot use proxy for external URLs");
				}
			} catch (error) {
				throw new Error(
					`Invalid URL format for proxy: ${error instanceof Error ? error.message : "unknown error"}`,
				);
			}
			// In browser, use proxy endpoint
			urlString = `/api/proxy?url=${encodeURIComponent(urlString)}`;
		} else {
			// For server-side, use the URL as-is or throw error
			throw new Error(
				"Relative URLs require useProxy=true in browser context or absolute URL",
			);
		}
	} else {
		// For absolute URLs, validate the URL before using
		try {
			const url = new URL(urlString);
			// Basic security check: reject dangerous protocols
			if (!["http:", "https:"].includes(url.protocol)) {
				throw new Error(`Unsupported protocol: ${url.protocol}`);
			}
		} catch (error) {
			throw new Error(
				`Invalid URL: ${error instanceof Error ? error.message : "unknown error"}`,
			);
		}
	}

	const url = new URL(urlString);

	// Add query parameters
	if (options.query) {
		for (const [key, value] of Object.entries(options.query)) {
			url.searchParams.append(key, value);
		}
	}

	// Prepare request options
	const requestOptions: RequestInit = {
		method,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	};

	// Add body if provided
	if (
		options.body &&
		(method === "POST" || method === "PUT" || method === "PATCH")
	) {
		requestOptions.body = JSON.stringify(options.body);
	}

	// Add timeout if provided
	const controller = new AbortController();
	const timeoutId = options.timeout
		? setTimeout(() => controller.abort(), options.timeout)
		: undefined;

	try {
		const response = await fetch(url.toString(), {
			...requestOptions,
			signal: controller.signal,
		});

		// Parse response data
		let data: unknown;
		const contentType = response.headers.get("content-type");
		if (contentType?.includes("application/json")) {
			data = await response.json();
		} else {
			data = await response.text();
		}

		// Extract headers
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});

		return {
			status: response.status,
			statusText: response.statusText,
			headers,
			data,
		};
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error(`Request timeout after ${options.timeout}ms`);
		}
		throw error;
	} finally {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	}
}

/**
 * Create Calendar API implementation
 *
 * @param pluginId Plugin ID making the API call
 * @returns Calendar API instance
 */
function createCalendarAPI(pluginId: string): CalendarAPI {
	return {
		async registerExtension(options: CalendarExtensionOptions): Promise<void> {
			try {
				calendarRegistry.registerCalendarExtension(pluginId, options);
				logger.info(
					{
						pluginId,
						extensionId: options.id,
						name: options.name,
					},
					"Calendar extension registered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, extensionId: options.id },
					"Failed to register calendar extension",
				);
				throw error;
			}
		},

		async unregisterExtension(extensionId: string): Promise<void> {
			try {
				calendarRegistry.unregisterCalendarExtension(pluginId, extensionId);
				logger.info(
					{ pluginId, extensionId },
					"Calendar extension unregistered",
				);
			} catch (error) {
				logger.error(
					{ error, pluginId, extensionId },
					"Failed to unregister calendar extension",
				);
				throw error;
			}
		},
	};
}
