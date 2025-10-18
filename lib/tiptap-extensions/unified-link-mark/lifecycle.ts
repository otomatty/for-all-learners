/**
 * UnifiedLinkMark lifecycle handlers
 * Manages editor lifecycle hooks for AutoReconciler
 */

import type { Editor } from "@tiptap/core";
import { AutoReconciler } from "../../unilink";
import { enqueueResolve } from "./resolver-queue";
import type { ResolverQueueItem } from "./types";

// Global AutoReconciler instance (managed per editor)
let globalAutoReconciler: AutoReconciler | null = null;

/**
 * Handler for editor creation
 * Initializes the AutoReconciler and sets up storage
 * @param editor - The Tiptap editor instance
 */
export function onCreateHandler(editor: Editor | null | undefined): void {
	// Guard against null or undefined editor
	if (!editor) {
		return;
	}

	// Initialize storage for resolverQueue (Mark extensions don't support addStorage)
	if (!editor.storage.unilink) {
		editor.storage.unilink = {};
	}

	editor.storage.unilink.resolverQueue = {
		add: (item: ResolverQueueItem) => {
			enqueueResolve(item);
		},
	};

	if (!globalAutoReconciler) {
		globalAutoReconciler = new AutoReconciler(editor);
		globalAutoReconciler.initialize();
	}
}

/**
 * Handler for editor destruction
 * Cleans up the AutoReconciler
 */
export function onDestroyHandler(): void {
	if (globalAutoReconciler) {
		globalAutoReconciler.destroy();
		globalAutoReconciler = null;
	}
}

/**
 * Get the global AutoReconciler instance
 * @returns The AutoReconciler instance or null
 */
export function getAutoReconciler(): AutoReconciler | null {
	return globalAutoReconciler;
}
