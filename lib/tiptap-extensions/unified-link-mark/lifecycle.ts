/**
 * UnifiedLinkMark lifecycle handlers
 * Manages editor lifecycle hooks for AutoReconciler
 */

import type { Editor } from "@tiptap/core";
import { AutoReconciler } from "../../unilink";

// Global AutoReconciler instance (managed per editor)
let globalAutoReconciler: AutoReconciler | null = null;

/**
 * Handler for editor creation
 * Initializes the AutoReconciler
 * @param editor - The Tiptap editor instance
 */
export function onCreateHandler(editor: Editor): void {
  if (editor && !globalAutoReconciler) {
    console.log("[UnifiedLinkMark] Initializing AutoReconciler...");
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
    console.log("[UnifiedLinkMark] Destroying AutoReconciler...");
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
