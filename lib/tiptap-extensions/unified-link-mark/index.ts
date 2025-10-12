/**
 * UnifiedLinkMark - Unified Link Mark Extension
 * Handles both [Title] and #tag notations in a single mark
 */

import { Mark } from "@tiptap/core";
import type { UnifiedLinkMarkOptions } from "./types";
import { DEFAULT_OPTIONS } from "./config";
import { unifiedLinkAttributes } from "./attributes";
import { onCreateHandler, onDestroyHandler } from "./lifecycle";
import { renderHTML, parseHTML } from "./rendering";
import { createCommands } from "./commands";
import { createInputRules } from "./input-rules";
import { createPlugins } from "./plugins";

// Re-export types for backward compatibility
export * from "./types";
export * from "./config";
export * from "./state-manager";
export * from "./resolver-queue";

/**
 * UnifiedLinkMark Extension
 * A TipTap mark extension for handling unified links
 */
export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
  name: "unilink",
  priority: 1000,
  inclusive: false,

  addOptions() {
    return DEFAULT_OPTIONS;
  },

  onCreate() {
    onCreateHandler(this.editor);
  },

  onDestroy() {
    onDestroyHandler();
  },

  addAttributes() {
    return unifiedLinkAttributes;
  },

  renderHTML({ HTMLAttributes }) {
    return renderHTML(HTMLAttributes, this.options);
  },

  parseHTML() {
    return parseHTML();
  },

  addCommands() {
    return createCommands({
      editor: this.editor,
      type: this.type,
    });
  },

  addInputRules() {
    return createInputRules({
      editor: this.editor,
      name: this.name,
    });
  },

  addProseMirrorPlugins() {
    return createPlugins({
      editor: this.editor,
      options: this.options,
    });
  },
});
