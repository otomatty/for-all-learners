/**
 * Bracket Cursor Plugin
 *
 * Monitors cursor movement and automatically converts closed bracket notation [text]
 * to UnifiedLinkMark when the cursor moves out of the brackets.
 *
 * This plugin complements the bracket InputRule by handling the case where
 * auto-bracket-close creates `[]` immediately when typing `[`.
 */

import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { nanoid } from "nanoid";
import logger from "@/lib/logger";
import { enqueueResolve } from "../resolver-queue";

const pluginKey = new PluginKey("bracketCursor");

/**
 * Creates a plugin that detects when the cursor moves out of closed brackets
 * and automatically converts them to UnifiedLinkMark.
 *
 * @param editor - The Tiptap editor instance
 * @returns ProseMirror Plugin
 */
export const createBracketCursorPlugin = (editor: Editor) => {
  return new Plugin({
    key: pluginKey,

    appendTransaction(_transactions, oldState, newState) {
      // Check if cursor position changed
      const oldSelection = oldState.selection;
      const newSelection = newState.selection;

      // Only proceed if:
      // 1. Cursor moved (position changed)
      // 2. Selection is empty (not a range selection)
      if (oldSelection.from === newSelection.from || !newSelection.empty) {
        return null;
      }

      logger.debug(
        {
          oldPos: oldSelection.from,
          newPos: newSelection.from,
        },
        "[BracketCursor] Cursor position changed"
      );

      // Get text around the cursor position
      const { $from } = newSelection;
      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 100),
        $from.parentOffset,
        null,
        "\ufffc"
      );

      logger.debug(
        { textBefore: textBefore.slice(-50) },
        "[BracketCursor] Text before cursor"
      );

      // Check if we just moved out of closed brackets
      // Pattern: [text] where text doesn't contain brackets
      const match = textBefore.match(/\[([^[\]]+)\]$/);
      if (!match) {
        logger.debug("[BracketCursor] No bracket pattern found");
        return null;
      }

      const raw = match[1];
      const key = raw.trim();
      const matchLength = match[0].length;
      const matchStart = $from.pos - matchLength;
      const matchEnd = $from.pos;

      logger.debug(
        {
          key,
          raw,
          matchStart,
          matchEnd,
          matchLength,
        },
        "[BracketCursor] Detected cursor leaving closed bracket"
      );

      // Check if this range already has a unilink mark
      const existingMark = newState.doc.rangeHasMark(
        matchStart,
        matchEnd,
        newState.schema.marks.unilink
      );

      if (existingMark) {
        logger.debug(
          { matchStart, matchEnd },
          "[BracketCursor] Range already has unilink mark, skipping"
        );
        return null;
      }

      // Apply UnifiedLinkMark
      const tr = newState.tr;
      const markId = nanoid();
      const mark = newState.schema.marks.unilink.create({
        key,
        raw,
        markId,
        variant: "bracket",
        state: "pending",
      });

      logger.debug(
        { key, raw, markId, matchStart, matchEnd },
        "[BracketCursor] Applying unilink mark"
      );

      tr.addMark(matchStart, matchEnd, mark);

      // Enqueue resolution
      logger.debug(
        { key, raw, markId, variant: "bracket" },
        "[BracketCursor] Enqueueing resolve"
      );

      enqueueResolve({
        key,
        raw,
        markId,
        editor,
        variant: "bracket",
      });

      return tr;
    },
  });
};
