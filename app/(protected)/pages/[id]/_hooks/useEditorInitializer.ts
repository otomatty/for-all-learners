import { useEffect } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { sanitizeContent } from "@/lib/utils/editor/content-sanitizer";
import { transformDollarInDoc } from "@/lib/utils/editor/latex-transformer";
import { migrateBracketsToMarks } from "@/lib/utils/editor/legacy-link-migrator";
import { transformMarkdownTables } from "@/lib/utils/transformMarkdownTables";
import { preloadPageTitles } from "@/lib/unilink/page-cache-preloader";

interface UseEditorInitializerProps {
  editor: Editor | null;
  initialDoc: JSONContent;
  userId: string;
}

/**
 * Initialize editor content with transformation pipeline
 *
 * This hook handles the initialization of editor content by applying
 * a series of transformations and setting up the editor state.
 *
 * Transformation pipeline:
 * 1. Preload page titles for link resolution
 * 2. Sanitize content (remove empty nodes, convert legacy marks)
 * 3. Migrate bracket [Title] and #tag syntax to unilink marks
 * 4. Transform LaTeX $...$ syntax to latexInlineNode
 * 5. Transform Markdown tables to table nodes
 * 6. Set content in editor
 * 7. Queue pending unilink marks for resolution
 *
 * @param editor - The TipTap editor instance
 * @param initialDoc - The initial document content to transform
 * @param userId - The user ID for preloading page titles
 */
export function useEditorInitializer({
  editor,
  initialDoc,
  userId,
}: UseEditorInitializerProps): void {
  useEffect(() => {
    if (!editor) return;

    // Preload all page titles into cache for cross-page link resolution
    void preloadPageTitles(userId).catch(() => {
      // Silently fail - preloading is an optimization, not critical
    });

    // Apply transformation pipeline
    const sanitized = sanitizeContent(initialDoc);
    const withMarks = migrateBracketsToMarks(sanitized);
    const withLatex = transformDollarInDoc(withMarks);
    const withTables = transformMarkdownTables(withLatex);

    try {
      // Set transformed content in editor
      editor.commands.setContent(withTables);

      // Queue all pending unilink marks for resolution
      queuePendingMarksForResolution(editor);
    } catch (error) {
      // Fallback: set empty document on error
      // biome-ignore lint/suspicious/noConsole: Error logging for content initialization failure
      console.error("[useEditorInitializer] Failed to set content:", error);
      editor.commands.setContent({ type: "doc", content: [] });
    }
  }, [editor, initialDoc, userId]);
}

/**
 * Queue all pending unilink marks for resolution
 *
 * After content is set in the editor, this function scans for all
 * unilink marks with state "pending" and adds them to the resolver
 * queue for async resolution.
 *
 * @param editor - The TipTap editor instance
 */
function queuePendingMarksForResolution(editor: Editor): void {
  const doc = editor.state.doc;
  const marks: Array<{
    key: string;
    raw: string;
    markId: string;
    variant: string;
    pos: number;
  }> = [];

  // Collect all pending unilink marks from the document
  doc.descendants((node, pos) => {
    if (node.isText && node.marks) {
      const unilinkMark = node.marks.find((m) => m.type.name === "unilink");
      if (unilinkMark && unilinkMark.attrs.state === "pending") {
        marks.push({
          key:
            unilinkMark.attrs.key ||
            unilinkMark.attrs.text?.toLowerCase() ||
            "",
          raw: unilinkMark.attrs.raw || unilinkMark.attrs.text || "",
          markId: unilinkMark.attrs.markId || `mark-${pos}`,
          variant: unilinkMark.attrs.variant,
          pos,
        });
      }
    }
  });

  if (marks.length === 0) return;

  // Defer resolution to ensure storage is fully initialized
  queueMicrotask(() => {
    // Check if resolverQueue is available (storage key is 'unilink', the mark name)
    const resolverQueue = editor.storage.unilink?.resolverQueue;
    if (!resolverQueue) {
      // biome-ignore lint/suspicious/noConsole: Warning for missing resolver queue
      console.warn(
        "[useEditorInitializer] Resolver queue not available in editor storage"
      );
      return;
    }

    // Add all pending marks to resolver queue
    for (const mark of marks) {
      resolverQueue.add({
        key: mark.key,
        raw: mark.raw,
        markId: mark.markId,
        editor,
        pos: mark.pos,
        variant: mark.variant as "bracket" | "tag",
      });
    }

    // biome-ignore lint/suspicious/noConsole: Debug logging for queued marks
    console.log(
      `[useEditorInitializer] Queued ${marks.length} pending marks for resolution`
    );
  });
}
