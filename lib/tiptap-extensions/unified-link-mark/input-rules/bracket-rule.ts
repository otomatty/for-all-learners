/**
 * Bracket InputRule ([Title])
 * Handles [Title] notation for creating unified links
 */

import { InputRule } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import type { UnifiedLinkAttributes } from "../types";
import { PATTERNS } from "../config";
import { normalizeTitleToKey } from "../../../unilink";
import { generateMarkId } from "../state-manager";
import { enqueueResolve } from "../resolver-queue";
import { isInCodeContext } from "./utils";

/**
 * Create the bracket InputRule
 * @param context - InputRule context
 * @returns InputRule instance
 */
export function createBracketInputRule(context: {
  editor: Editor;
  name: string;
}) {
  return new InputRule({
    find: PATTERNS.bracket,
    handler: ({ state, match, range, chain }) => {
      // Suppress in code context
      if (isInCodeContext(state)) {
        return null;
      }

      const raw = match[1];
      const text = raw;
      const key = normalizeTitleToKey(raw);
      const markId = generateMarkId();

      // Check if external link
      const isExternal = PATTERNS.externalUrl.test(raw);

      const { from, to } = range;

      const attrs: UnifiedLinkAttributes = {
        variant: "bracket",
        raw,
        text,
        key,
        pageId: null,
        href: isExternal ? raw : "#",
        state: isExternal ? "exists" : "pending",
        exists: isExternal,
        markId,
      };

      // Apply mark using chain API
      chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({
          type: "text",
          text: text,
          marks: [
            {
              type: context.name,
              attrs,
            },
          ],
        })
        .run();

      // Enqueue for resolution if not external
      if (!isExternal) {
        enqueueResolve({
          key,
          markId,
          editor: context.editor,
          variant: "bracket",
        });
      }
    },
  });
}
