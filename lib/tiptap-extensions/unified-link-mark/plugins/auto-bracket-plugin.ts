/**
 * Auto-bracket closing plugin
 * Automatically closes brackets when typing [
 */

import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

/**
 * Create the auto-bracket plugin
 * @returns ProseMirror Plugin
 */
export function createAutoBracketPlugin() {
  return new Plugin({
    key: new PluginKey("unifiedLinkAutoBracket"),
    props: {
      handleTextInput(view, from, to, text) {
        if (text !== "[") {
          return false;
        }

        const { state, dispatch } = view;
        const $pos = state.doc.resolve(from);

        // Auto-close only at end of paragraph without trailing text
        if ($pos.parent.type.name === "paragraph") {
          const paraEnd = $pos.end($pos.depth);
          const after = state.doc.textBetween(to, paraEnd);

          if (/^\s*$/.test(after)) {
            // No trailing text, auto-close
            const tr = state.tr.insertText("[]", from, to);
            // Set cursor inside brackets
            tr.setSelection(TextSelection.create(tr.doc, from + 1));
            dispatch(tr);
            return true;
          }
        }

        return false;
      },
    },
  });
}
