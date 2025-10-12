/**
 * UnifiedLinkMark state management
 * Handles mark state updates and ID generation
 */

import type { Editor } from "@tiptap/core";
import type { UnifiedLinkAttributes } from "./types";

/**
 * Update mark state by markId
 * @param editor - The Tiptap editor instance
 * @param markId - The unique mark identifier
 * @param updates - Partial attributes to update
 */
export function updateMarkState(
  editor: Editor,
  markId: string,
  updates: Partial<UnifiedLinkAttributes>
): void {
  try {
    const { state, dispatch } = editor.view;
    if (!state || !dispatch) {
      console.warn("Editor state or dispatch not available");
      return;
    }

    const { tr } = state;
    const markType = state.schema.marks.unilink;
    if (!markType) {
      console.warn("unilink mark type not found in schema");
      return;
    }

    let changed = false;

    state.doc.descendants((node, pos: number) => {
      if (!node.isText || !node.text) return;

      for (const mark of node.marks) {
        if (mark.type === markType && mark.attrs.markId === markId) {
          const newAttrs = { ...mark.attrs, ...updates };

          // Sync exists flag with state
          if (updates.state) {
            newAttrs.exists = updates.state === "exists";
          }

          tr.removeMark(pos, pos + node.text.length, markType);
          tr.addMark(pos, pos + node.text.length, markType.create(newAttrs));
          changed = true;
        }
      }
    });

    if (changed) {
      dispatch(tr);
    }
  } catch (error) {
    console.error("Failed to update mark state:", error);
  }
}

/**
 * Generate a unique mark ID
 * @returns A unique mark identifier
 */
export function generateMarkId(): string {
  return `unilink-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Find all marks with a specific state
 * @param editor - The Tiptap editor instance
 * @param state - The state to filter by
 * @returns Array of marks with the specified state
 */
export function findMarksByState(
  editor: Editor,
  state: UnifiedLinkAttributes["state"]
): Array<{ markId: string; key: string; variant?: "bracket" | "tag" }> {
  const marks: Array<{
    markId: string;
    key: string;
    variant?: "bracket" | "tag";
  }> = [];
  const { doc } = editor.state;
  const markType = editor.schema.marks.unilink;

  if (!markType) return marks;

  doc.descendants((node) => {
    if (!node.isText) return;

    for (const mark of node.marks) {
      if (mark.type === markType && mark.attrs.state === state) {
        marks.push({
          markId: mark.attrs.markId,
          key: mark.attrs.key,
          variant: mark.attrs.variant,
        });
      }
    }
  });

  return marks;
}
