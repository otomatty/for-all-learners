/**
 * Plugin API Implementation
 *
 * This file implements the API that plugins can use to interact with the host application.
 * All API calls from plugins are proxied through Web Workers for security.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-loader.ts
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
import { getEditorManager } from "./editor-manager";
import { getEditorExtensionRegistry } from "./editor-registry";
import type {
	Command,
	DialogOptions,
	EditorExtensionOptions,
	EditorSelection,
	NotificationType,
} from "./types";

// Import package.json for version information
import pkg from "../../package.json";

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

	// Future extension points (Phase 3+)
	// ai?: AIAPI;
	// data?: DataAPI;
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
 * UI API (basic functionality in Phase 1)
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
	return {
		async get<T = unknown>(key: string): Promise<T | undefined> {
			try {
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
				const { setPluginStorage } = await import(
					"@/app/_actions/plugin-storage"
				);
				await setPluginStorage(pluginId, key, value);
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
				const { deletePluginStorage } = await import(
					"@/app/_actions/plugin-storage"
				);
				await deletePluginStorage(pluginId, key);
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
				const { clearPluginStorage } = await import(
					"@/app/_actions/plugin-storage"
				);
				await clearPluginStorage(pluginId);
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
	const registry = getEditorExtensionRegistry();
	const manager = getEditorManager();

	return {
		async registerExtension(options: EditorExtensionOptions): Promise<void> {
			try {
				registry.register(pluginId, options);

				// Apply extensions to all registered editors
				const managerInstance = getEditorManager();
				managerInstance.applyExtensionsToAllEditors();

				logger.info(
					{ pluginId, extensionId: options.id, type: options.type },
					"Editor extension registered and applied",
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
				registry.unregister(pluginId, extensionId);

				// Reapply extensions to all registered editors
				const managerInstance = getEditorManager();
				managerInstance.applyExtensionsToAllEditors();

				logger.info(
					{ pluginId, extensionId },
					"Editor extension unregistered",
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

		async setContent(
			content: JSONContent,
			editorId?: string,
		): Promise<void> {
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
