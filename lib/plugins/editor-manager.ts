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
import { getEditorExtensionRegistry } from "./editor-registry";
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

		// Apply all plugin extensions
		this.applyAllPluginExtensions(editorId);

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
	 * Apply all plugin extensions to an editor
	 *
	 * @param editorId Editor ID
	 */
	public applyAllPluginExtensions(editorId: string): void {
		const editor = this.editors.get(editorId);

		if (!editor) {
			logger.warn({ editorId }, "Cannot apply extensions: editor not found");
			return;
		}

		const registry = getEditorExtensionRegistry();
		const pluginExtensions = registry.getTiptapExtensions();
		const baseExtensions = this.baseExtensions.get(editorId) ?? [];

		// Combine base extensions and plugin extensions
		const allExtensions = [...baseExtensions, ...pluginExtensions] as unknown[];

		try {
			// Update editor extensions
			editor.setExtensions(allExtensions);
			logger.info(
				{
					editorId,
					baseExtensionCount: baseExtensions.length,
					pluginExtensionCount: pluginExtensions.length,
				},
				"All plugin extensions applied to editor",
			);
		} catch (error) {
			logger.error(
				{ error, editorId },
				"Failed to apply plugin extensions to editor",
			);
			throw error;
		}
	}

	/**
	 * Apply extensions to all registered editors
	 */
	public applyExtensionsToAllEditors(): void {
		for (const editorId of this.editors.keys()) {
			this.applyAllPluginExtensions(editorId);
		}
	}

	/**
	 * Apply extensions from a specific plugin to an editor
	 *
	 * @param editorId Editor ID
	 * @param pluginId Plugin ID
	 */
	public applyPluginExtensions(editorId: string, _pluginId: string): void {
		// Reapply all extensions (simpler approach)
		this.applyAllPluginExtensions(editorId);
	}

	/**
	 * Remove extensions from a specific plugin from an editor
	 *
	 * @param editorId Editor ID
	 * @param pluginId Plugin ID
	 */
	public removePluginExtensions(editorId: string, _pluginId: string): void {
		// Reapply all extensions without the removed plugin's extensions
		this.applyAllPluginExtensions(editorId);
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
