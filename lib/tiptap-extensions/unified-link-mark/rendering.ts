/**
 * UnifiedLinkMark rendering logic
 * Handles HTML rendering and parsing
 */

import { mergeAttributes } from "@tiptap/core";
import type { UnifiedLinkMarkOptions } from "./types";

/**
 * Render the mark as HTML
 * @param HTMLAttributes - The mark attributes
 * @param options - The mark options
 * @returns HTML specification array
 */
export function renderHTML(
  HTMLAttributes: Record<string, unknown>,
  options: UnifiedLinkMarkOptions
): ["a", Record<string, unknown>, 0] {
  const { variant, ...rest } = HTMLAttributes;
  const variantClass = `unilink--${variant}`;

  return [
    "a",
    mergeAttributes(options.HTMLAttributes, rest, {
      class: `${options.HTMLAttributes.class} ${variantClass}`,
    }),
    0,
  ];
}

/**
 * Parse HTML to mark
 * @returns HTML parsing specification
 */
export function parseHTML() {
  return [
    {
      tag: "a[data-variant]",
    },
  ];
}
