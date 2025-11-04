/**
 * Editor Manager
 *
 * Manages editor instances and applies plugin extensions to them.
 * Handles registration, unregistration, and extension application for editor instances.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-api.ts
 *   └─ components/pages/_hooks/usePageEditorLogic.ts
 *   └─ components/tiptap-editor.tsx
 *
 * Dependencies:
 *   ├─ lib/plugins/editor-registry.ts
 *   ├─ lib/plugins/types.ts
 *   └─ @tiptap/core (Editor type)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase2-editor-extensions.md
 */

import type { Editor, JSONContent } from "@tiptap/core";
import logger from "@/lib/logger";
import * as editorRegistry from "./editor-registry";
import type { EditorSelection } from "./types";

// ============================================================================
// Editor Manager Class
// ============================================================================

/**
 * Editor Manager
 *
 * Singleton manager for editor instances and plugin extensions.
 * Manages editor registration and applies plugin extensions dynamically.
 */
export class EditorManager {
	private static instance: EditorManager | null = null;

	/** Map of editor ID to Editor instance */
	private editors: Map<string, Editor>;

	/** Active editor ID (last focused editor) */
	private activeEditorId: string | null = null;

	/** Map of editor ID to base extensions (non-plugin extensions) */
	private baseExtensions: Map<string, unknown[]>; // Extension[]

	/**
	 * Private constructor (Singleton pattern)
	 */
	private constructor() {
		this.editors = new Map();
		this.baseExtensions = new Map();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): EditorManager {
		if (!EditorManager.instance) {
			EditorManager.instance = new EditorManager();
		}
		return EditorManager.instance;
	}

	/**
	 * Reset manager (for testing)
	 */
	public static reset(): void {
		EditorManager.instance = null;
	}

	// ========================================================================
	// Editor Registration
	// ========================================================================

	/**
	 * Register an editor instance
	 *
	 * @param editorId Unique editor ID
	 * @param editor Editor instance
	 * @param baseExtensions Base extensions (non-plugin extensions)
	 *
	 * @note TipTap does not support dynamic extension updates after editor initialization.
	 *       Plugin extensions must be included when creating the editor instance.
	 *       Use getTiptapExtensions() from editor-registry to get plugin extensions
	 *       and include them in the extensions array when calling useEditor().
	 */
	public registerEditor(
		editorId: string,
		editor: Editor,
		baseExtensions: unknown[] = [], // Extension[]
	): void {
		if (this.editors.has(editorId)) {
			logger.warn({ editorId }, "Editor already registered, updating");
		}

		this.editors.set(editorId, editor);
		this.baseExtensions.set(editorId, baseExtensions);

		// Note: TipTap does not support setExtensions() after initialization.
		// Plugin extensions must be included when creating the editor.
		// We only log a warning if plugin extensions exist but were not included.
		const pluginExtensions = editorRegistry.getTiptapExtensions();
		if (pluginExtensions.length > 0) {
			logger.warn(
				{
					editorId,
					pluginExtensionCount: pluginExtensions.length,
				},
				"Plugin extensions exist but cannot be applied dynamically. " +
					"Ensure plugin extensions are included when creating the editor.",
			);
		}

		logger.info({ editorId }, "Editor registered");
	}

	/**
	 * Unregister an editor instance
	 *
	 * @param editorId Editor ID
	 */
	public unregisterEditor(editorId: string): void {
		if (!this.editors.has(editorId)) {
			logger.warn({ editorId }, "Editor not found for unregistration");
			return;
		}

		this.editors.delete(editorId);
		this.baseExtensions.delete(editorId);

		if (this.activeEditorId === editorId) {
			this.activeEditorId = null;
		}

		logger.info({ editorId }, "Editor unregistered");
	}

	/**
	 * Set active editor (last focused editor)
	 *
	 * @param editorId Editor ID
	 */
	public setActiveEditor(editorId: string): void {
		if (!this.editors.has(editorId)) {
			logger.warn({ editorId }, "Cannot set active editor: not registered");
			return;
		}

		this.activeEditorId = editorId;
		logger.debug({ editorId }, "Active editor set");
	}

	/**
	 * Get active editor
	 *
	 * @returns Active editor instance or null
	 */
	public getActiveEditor(): Editor | null {
		if (!this.activeEditorId) {
			return null;
		}

		return this.editors.get(this.activeEditorId) ?? null;
	}

	/**
	 * Get editor by ID
	 *
	 * @param editorId Editor ID (optional, defaults to active editor)
	 * @returns Editor instance or null
	 */
	public getEditor(editorId?: string): Editor | null {
		if (!editorId) {
			return this.getActiveEditor();
		}

		return this.editors.get(editorId) ?? null;
	}

	// ========================================================================
	// Extension Management
	// ========================================================================

	/**
	 * Get all extensions (base + plugin) for an editor
	 *
	 * @param editorId Editor ID
	 * @returns Combined array of base and plugin extensions
	 *
	 * @note This method returns the extensions but does not apply them.
	 *       TipTap does not support dynamic extension updates after editor initialization.
	 *       Use this method to get the extensions array when creating a new editor instance.
	 */
	public getAllExtensions(editorId: string): unknown[] {
		const baseExtensions = this.baseExtensions.get(editorId) ?? [];
		const pluginExtensions = editorRegistry.getTiptapExtensions();
		return [...baseExtensions, ...pluginExtensions];
	}

	/**
	 * Apply all plugin extensions to an editor
	 *
	 * @deprecated TipTap does not support dynamic extension updates after editor initialization.
	 *             Plugin extensions must be included when creating the editor instance.
	 *             This method is kept for backward compatibility but does nothing.
	 *
	 * @param editorId Editor ID
	 */
	public applyAllPluginExtensions(editorId: string): void {
		logger.warn(
			{ editorId },
			"applyAllPluginExtensions() is deprecated. " +
				"TipTap does not support dynamic extension updates. " +
				"Plugin extensions must be included when creating the editor.",
		);
		// Do nothing - TipTap does not support setExtensions() after initialization
	}

	/**
	 * Apply extensions to all registered editors
	 *
	 * @deprecated TipTap does not support dynamic extension updates after editor initialization.
	 *             Plugin extensions must be included when creating the editor instance.
	 *             This method is kept for backward compatibility but does nothing.
	 */
	public applyExtensionsToAllEditors(): void {
		logger.warn(
			"applyExtensionsToAllEditors() is deprecated. " +
				"TipTap does not support dynamic extension updates. " +
				"Plugin extensions must be included when creating the editor.",
		);
		// Do nothing - TipTap does not support setExtensions() after initialization
	}

	/**
	 * Apply extensions from a specific plugin to an editor
	 *
	 * @deprecated TipTap does not support dynamic extension updates after editor initialization.
	 *             Plugin extensions must be included when creating the editor instance.
	 *             This method is kept for backward compatibility but does nothing.
	 *
	 * @param editorId Editor ID
	 * @param pluginId Plugin ID
	 */
	public applyPluginExtensions(editorId: string, _pluginId: string): void {
		logger.warn(
			{ editorId, pluginId: _pluginId },
			"applyPluginExtensions() is deprecated. " +
				"TipTap does not support dynamic extension updates. " +
				"Plugin extensions must be included when creating the editor.",
		);
		// Do nothing - TipTap does not support setExtensions() after initialization
	}

	/**
	 * Remove extensions from a specific plugin from an editor
	 *
	 * @deprecated TipTap does not support dynamic extension updates after editor initialization.
	 *             Plugin extensions must be included when creating the editor instance.
	 *             This method is kept for backward compatibility but does nothing.
	 *
	 * @param editorId Editor ID
	 * @param pluginId Plugin ID
	 */
	public removePluginExtensions(editorId: string, _pluginId: string): void {
		logger.warn(
			{ editorId, pluginId: _pluginId },
			"removePluginExtensions() is deprecated. " +
				"TipTap does not support dynamic extension updates. " +
				"Plugin extensions must be included when creating the editor.",
		);
		// Do nothing - TipTap does not support setExtensions() after initialization
	}

	// ========================================================================
	// Editor Operations
	// ========================================================================

	/**
	 * Execute a command on an editor
	 *
	 * @param editorId Editor ID (optional, defaults to active editor)
	 * @param command Command name
	 * @param args Command arguments
	 * @returns Command result
	 */
	public async executeCommand(
		editorId: string | undefined,
		command: string,
		...args: unknown[]
	): Promise<unknown> {
		const editor = this.getEditor(editorId);

		if (!editor) {
			throw new Error(
				`Editor ${editorId ?? "active"} not found for command execution`,
			);
		}

		// Check if command exists
		const chain = editor.chain();
		const commandFn = (chain as Record<string, (...a: unknown[]) => unknown>)[
			command
		];

		if (typeof commandFn !== "function") {
			throw new Error(`Command ${command} not found`);
		}

		try {
			// .run() must be called to execute the command
			const chainResult = commandFn.apply(chain, args) as {
				run: () => unknown;
			};
			return chainResult.run();
		} catch (error) {
			logger.error(
				{ error, editorId, command, args },
				"Failed to execute editor command",
			);
			throw error;
		}
	}

	/**
	 * Get editor content as JSON
	 *
	 * @param editorId Editor ID (optional, defaults to active editor)
	 * @returns Editor content as JSONContent
	 */
	public async getContent(editorId?: string): Promise<JSONContent> {
		const editor = this.getEditor(editorId);

		if (!editor) {
			throw new Error(
				`Editor ${editorId ?? "active"} not found for content retrieval`,
			);
		}

		return editor.getJSON();
	}

	/**
	 * Set editor content
	 *
	 * @param editorId Editor ID (optional, defaults to active editor)
	 * @param content Content to set
	 */
	public async setContent(
		editorId: string | undefined,
		content: JSONContent,
	): Promise<void> {
		const editor = this.getEditor(editorId);

		if (!editor) {
			throw new Error(
				`Editor ${editorId ?? "active"} not found for content setting`,
			);
		}

		editor.commands.setContent(content);
	}

	/**
	 * Get editor selection
	 *
	 * @param editorId Editor ID (optional, defaults to active editor)
	 * @returns Selection range or null if no selection
	 */
	public async getSelection(
		editorId?: string,
	): Promise<EditorSelection | null> {
		const editor = this.getEditor(editorId);

		if (!editor) {
			throw new Error(
				`Editor ${editorId ?? "active"} not found for selection retrieval`,
			);
		}

		const { from, to } = editor.state.selection;

		if (from === to) {
			return null;
		}

		return { from, to };
	}

	/**
	 * Set editor selection
	 *
	 * @param editorId Editor ID (optional, defaults to active editor)
	 * @param from Selection start position
	 * @param to Selection end position
	 */
	public async setSelection(
		editorId: string | undefined,
		from: number,
		to: number,
	): Promise<void> {
		const editor = this.getEditor(editorId);

		if (!editor) {
			throw new Error(
				`Editor ${editorId ?? "active"} not found for selection setting`,
			);
		}

		editor.commands.setTextSelection({ from, to });
	}

	/**
	 * Check if a command can be executed
	 *
	 * @param editorId Editor ID (optional, defaults to active editor)
	 * @param command Command name
	 * @returns True if command can be executed
	 */
	public async canExecuteCommand(
		editorId: string | undefined,
		command: string,
	): Promise<boolean> {
		const editor = this.getEditor(editorId);

		if (!editor) {
			return false;
		}

		const canChain = editor.can();
		const commandFn = (canChain as unknown as Record<string, () => boolean>)[
			command
		];

		if (typeof commandFn !== "function") {
			return false;
		}

		// Call the command on the `can()` chain to check its availability
		return commandFn();
	}

	// ========================================================================
	// Statistics
	// ========================================================================

	/**
	 * Get manager statistics
	 *
	 * @returns Statistics about registered editors
	 */
	public getStats(): {
		totalEditors: number;
		activeEditorId: string | null;
	} {
		return {
			totalEditors: this.editors.size,
			activeEditorId: this.activeEditorId,
		};
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get editor manager instance
 */
export function getEditorManager(): EditorManager {
	return EditorManager.getInstance();
}
