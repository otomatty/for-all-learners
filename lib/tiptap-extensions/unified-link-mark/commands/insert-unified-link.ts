/**
 * insertUnifiedLink command
 * Inserts a unified link mark with pending state and queues it for resolution
 */

import type { CommandProps, Editor } from "@tiptap/core";
import type { MarkType } from "prosemirror-model";
import { normalizeTitleToKey } from "../../../unilink";
import { enqueueResolve } from "../resolver-queue";
import { generateMarkId } from "../state-manager";
import type { UnifiedLinkAttributes } from "../types";

/**
 * Create the insertUnifiedLink command
 * @param context - Command context containing editor and type
 * @returns Command function
 */
export function createInsertUnifiedLinkCommand(context: {
	editor: Editor;
	type: MarkType;
}) {
	return (attrs: Partial<UnifiedLinkAttributes>) =>
		({ state, dispatch }: CommandProps) => {
			const { selection } = state;
			const { from, to } = selection;

			const markId = generateMarkId();
			const key = normalizeTitleToKey(attrs.raw || "");

			const fullAttrs: UnifiedLinkAttributes = {
				variant: attrs.variant || "bracket",
				raw: attrs.raw || "",
				text: attrs.text || attrs.raw || "",
				key,
				pageId: null,
				href: "#",
				state: "pending",
				exists: false,
				markId,
				...attrs,
			};

			if (dispatch) {
				const tr = state.tr.addMark(from, to, context.type.create(fullAttrs));
				dispatch(tr);

				// Enqueue for resolution
				enqueueResolve({
					key,
					markId,
					editor: context.editor,
					variant: fullAttrs.variant,
				});
			}

			return true;
		};
}
