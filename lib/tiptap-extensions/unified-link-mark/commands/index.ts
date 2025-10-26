/**
 * UnifiedLinkMark commands
 * Exports all command creators
 */

import type { Editor } from "@tiptap/core";
import type { MarkType } from "prosemirror-model";
import { createInsertUnifiedLinkCommand } from "./insert-unified-link";
import { createRefreshUnifiedLinksCommand } from "./refresh-unified-links";
import { createWrapWithBracketsCommand } from "./wrap-with-brackets";
import { createUnwrapBracketsCommand } from "./unwrap-brackets";

/**
 * Create all commands for UnifiedLinkMark
 * @param context - Command context
 * @returns Commands object
 */
export function createCommands(context: { editor: Editor; type: MarkType }) {
	return {
		insertUnifiedLink: createInsertUnifiedLinkCommand(context),
		refreshUnifiedLinks: createRefreshUnifiedLinksCommand(context),
		wrapWithBrackets: createWrapWithBracketsCommand(),
		unwrapBrackets: createUnwrapBracketsCommand(context),
	};
}
