/**
 * Click handler plugin
 * Handles clicks on unified link marks
 *
 * Phase 3.1 Extensions:
 * - Bracket click detection (backward compatibility)
 * - .icon notation support
 * - External link support
 * - noteSlug integration
 */

import { Plugin, PluginKey } from "prosemirror-state";
import type { ResolvedPos } from "prosemirror-model";
import type { Mark } from "prosemirror-model";
import type { Editor } from "@tiptap/core";
import type { UnifiedLinkAttributes, UnifiedLinkMarkOptions } from "../types";
import {
  navigateToPage,
  handleMissingLinkClick,
  resolveIconLink,
  parseBracketContent,
  isExternalLink,
  openExternalLink,
  navigateToPageWithContext,
} from "../../../unilink/resolver";

/**
 * Phase 3.1: Detect bracket pattern at cursor position (backward compatibility)
 * For content that hasn't been converted to UnifiedLinkMark yet
 */
function detectBracketAtPosition(
  $pos: ResolvedPos
): { content: string; start: number; end: number } | null {
  const node = $pos.node();

  // Ignore non-text nodes
  if (!node.isText || !node.text) {
    return null;
  }

  // Ignore code blocks and inline code
  if (
    $pos.parent.type.name === "codeBlock" ||
    node.marks.some((mark: Mark) => mark.type.name === "code")
  ) {
    return null;
  }

  const text = node.text;
  const posInNode = $pos.textOffset;

  // Find bracket pair that contains the cursor position
  let bracketStart = -1;
  let bracketEnd = -1;
  let inBracket = false;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "[" && !inBracket) {
      bracketStart = i;
      inBracket = true;
      continue;
    }
    if (text[i] === "]" && inBracket) {
      bracketEnd = i;
      if (posInNode >= bracketStart && posInNode <= bracketEnd) {
        const content = text.substring(bracketStart + 1, bracketEnd);
        return {
          content,
          start: bracketStart,
          end: bracketEnd,
        };
      }
      inBracket = false;
      bracketStart = -1;
    }
  }

  return null;
}

/**
 * Phase 3.1: Handle bracket click (backward compatibility)
 */
async function handleBracketClick(
  bracketContent: string,
  context: { editor: Editor; options: UnifiedLinkMarkOptions }
): Promise<boolean> {
  const parsed = parseBracketContent(bracketContent);
  const { noteSlug } = context.options;

  console.log("[UnifiedLinkMark] Bracket click detected:", parsed);

  // Handle .icon notation
  if (parsed.type === "icon" && parsed.userSlug) {
    const result = await resolveIconLink(parsed.userSlug, noteSlug);
    if (result) {
      window.location.href = result.href;
    }
    return true;
  }

  // Handle external links
  if (parsed.type === "external") {
    openExternalLink(parsed.slug);
    return true;
  }

  // Handle regular page links
  // This will be handled by the existing PageLink extension
  // until full migration is complete
  return false;
}

/**
 * Create the click handler plugin
 * @param context - Plugin context
 * @returns ProseMirror Plugin
 */
export function createClickHandlerPlugin(context: {
  editor: Editor;
  options: UnifiedLinkMarkOptions;
}) {
  return new Plugin({
    key: new PluginKey("unifiedLinkClickHandler"),
    props: {
      handleClick: (view, pos, event) => {
        const { state } = view;
        const { doc } = state;
        const $pos = doc.resolve(pos);

        // Phase 3.1: Priority 1 - Check for unilink mark
        const unilinkMark = $pos
          .marks()
          .find((mark) => mark.type.name === "unilink");

        if (unilinkMark) {
          event.preventDefault();
          const attrs = unilinkMark.attrs as UnifiedLinkAttributes;

          console.log(
            `[UnifiedLinkMark] Click: state=${attrs.state}, linkType=${attrs.linkType}, pageId=${attrs.pageId}`
          );

          // Phase 3.1: Handle by linkType
          if (attrs.linkType === "icon" && attrs.userSlug) {
            // Handle .icon links
            resolveIconLink(attrs.userSlug, context.options.noteSlug).then(
              (result) => {
                if (result) {
                  window.location.href = result.href;
                }
              }
            );
            return true;
          }

          if (attrs.linkType === "external" && attrs.href) {
            // Handle external links
            openExternalLink(attrs.href);
            return true;
          }

          // Handle regular page links with noteSlug support
          if (attrs.state === "exists" && attrs.pageId) {
            navigateToPageWithContext(
              attrs.pageId,
              context.options.noteSlug,
              attrs.created
            );
          } else if (attrs.state === "missing" && attrs.text && attrs.markId) {
            handleMissingLinkClick(
              context.editor,
              attrs.markId,
              attrs.text,
              context.options.userId || undefined,
              context.options.onShowCreatePageDialog
            );
          } else if (attrs.state === "pending") {
            console.log("[UnifiedLinkMark] Link is still resolving...");
          } else {
            console.warn(
              "[UnifiedLinkMark] Unknown state or missing data:",
              attrs
            );
          }

          return true;
        }

        // Phase 3.1: Priority 2 - Check for bracket pattern (backward compatibility)
        const bracketDetection = detectBracketAtPosition($pos);
        if (bracketDetection) {
          event.preventDefault();
          handleBracketClick(bracketDetection.content, context);
          return true;
        }

        return false;
      },
    },
  });
}
