/**
 * UnifiedLinkMark InputRules
 * Exports all InputRules
 */

import type { Editor } from "@tiptap/core";
import { createBracketInputRule } from "./bracket-rule";
import { createTagInputRule } from "./tag-rule";

/**
 * Create all InputRules for UnifiedLinkMark
 * @param context - InputRule context
 * @returns Array of InputRules
 */
export function createInputRules(context: { editor: Editor; name: string }) {
  return [createTagInputRule(context), createBracketInputRule(context)];
}
