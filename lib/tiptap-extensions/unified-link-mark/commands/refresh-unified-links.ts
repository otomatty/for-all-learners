/**
 * refreshUnifiedLinks command
 * Refreshes all non-exists unified links by re-queuing them for resolution
 */

import type { CommandProps, Editor } from "@tiptap/core";
import type { MarkType } from "prosemirror-model";
import { enqueueResolve } from "../resolver-queue";

/**
 * Create the refreshUnifiedLinks command
 * @param context - Command context containing editor and type
 * @returns Command function
 */
export function createRefreshUnifiedLinksCommand(context: {
	editor: Editor;
	type: MarkType;
}) {
	return () =>
		({ state }: CommandProps) => {
			const markType = context.type;
			const toRefresh: Array<{
				key: string;
				markId: string;
				variant?: "bracket" | "tag";
			}> = [];

			state.doc.descendants((node) => {
				if (!node.isText) return;

				for (const mark of node.marks) {
					if (mark.type === markType && mark.attrs.state !== "exists") {
						toRefresh.push({
							key: mark.attrs.key,
							markId: mark.attrs.markId,
							variant: mark.attrs.variant,
						});
					}
				}
			});

			// Enqueue all marks for refresh
			for (const { key, markId, variant } of toRefresh) {
				enqueueResolve({
					key,
					markId,
					editor: context.editor,
					variant,
				});
			}

			return true;
		};
}
