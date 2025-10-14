/**
 * Heading Remover Utility
 *
 * Provides utility functions to remove or convert H1 headings in TipTap documents.
 * This is useful for ensuring that page content does not contain H1 headings,
 * which are typically reserved for the page title.
 *
 * @module heading-remover
 */

import type { JSONContent } from "@tiptap/core";

/**
 * Remove all H1 headings from a document by converting them to paragraphs
 *
 * H1 headings (level 1) are typically reserved for page titles and should not
 * appear in the editor content. This function recursively traverses the document
 * and converts any H1 headings to paragraphs while preserving their content.
 *
 * @param doc - The TipTap document to process
 * @returns A new document with all H1 headings converted to paragraphs
 *
 * @example
 * ```typescript
 * const doc = {
 *   type: "doc",
 *   content: [
 *     { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
 *     { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Subtitle" }] },
 *   ]
 * };
 * const result = removeH1Headings(doc);
 * // Result: First heading converted to paragraph, second heading preserved
 * ```
 */
export function removeH1Headings(doc: JSONContent): JSONContent {
  const recurse = (node: JSONContent): JSONContent => {
    // If this is a heading node
    if (node.type === "heading") {
      // Access attrs with proper type assertion
      const attrs = (node as JSONContent & { attrs?: { level: number } }).attrs;
      const level = attrs?.level;

      // Convert H1 (level 1) or headings without a level to paragraphs
      if (!level || level === 1) {
        return {
          type: "paragraph",
          content: node.content,
        } as JSONContent;
      }
    }

    // Recursively process children
    if (Array.isArray(node.content)) {
      return {
        ...node,
        content: node.content.map(recurse),
      };
    }

    return node;
  };

  // Process the entire document
  return {
    ...doc,
    content: doc.content?.map(recurse),
  } as JSONContent;
}

/**
 * Check if a document contains any H1 headings
 *
 * This function can be used to validate that a document does not contain
 * any H1 headings before saving.
 *
 * @param doc - The TipTap document to check
 * @returns true if the document contains at least one H1 heading, false otherwise
 *
 * @example
 * ```typescript
 * const doc = { type: "doc", content: [...] };
 * if (hasH1Headings(doc)) {
 *   console.warn("Document contains H1 headings that should be removed");
 * }
 * ```
 */
export function hasH1Headings(doc: JSONContent): boolean {
  const checkNode = (node: JSONContent): boolean => {
    if (node.type === "heading") {
      const attrs = (node as JSONContent & { attrs?: { level: number } }).attrs;
      const level = attrs?.level;
      if (!level || level === 1) {
        return true;
      }
    }

    if (Array.isArray(node.content)) {
      return node.content.some(checkNode);
    }

    return false;
  };

  return doc.content?.some(checkNode) ?? false;
}
