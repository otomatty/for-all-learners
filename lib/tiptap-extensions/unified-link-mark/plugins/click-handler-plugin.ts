/**
 * Click handler plugin
 * Handles clicks on unified link marks
 */

import { Plugin, PluginKey } from "prosemirror-state";
import type { Editor } from "@tiptap/core";
import type { UnifiedLinkAttributes, UnifiedLinkMarkOptions } from "../types";
import {
  navigateToPage,
  handleMissingLinkClick,
} from "../../../unilink/resolver";

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

        // Check if there's a unilink mark at the clicked position
        const unilinkMark = $pos
          .marks()
          .find((mark) => mark.type.name === "unilink");

        if (!unilinkMark) {
          return false;
        }

        event.preventDefault();
        const attrs = unilinkMark.attrs as UnifiedLinkAttributes;

        console.log(
          `[UnifiedLinkMark] Click: state=${attrs.state}, pageId=${attrs.pageId}, text=${attrs.text}`
        );

        if (attrs.state === "exists" && attrs.pageId) {
          // Navigate to existing page
          navigateToPage(attrs.pageId);
        } else if (attrs.state === "missing" && attrs.text && attrs.markId) {
          // Handle missing link - create page flow
          handleMissingLinkClick(
            context.editor,
            attrs.markId,
            attrs.text,
            context.options.userId || undefined,
            context.options.onShowCreatePageDialog
          );
        } else if (attrs.state === "pending") {
          // Do nothing for pending state
          console.log("[UnifiedLinkMark] Link is still resolving...");
        } else {
          console.warn(
            "[UnifiedLinkMark] Unknown state or missing data:",
            attrs
          );
        }

        return true;
      },
    },
  });
}
