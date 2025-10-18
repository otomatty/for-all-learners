/**
 * Mark Operations
 * Handles TipTap mark manipulations for UnifiedLinkMark
 */

import type { Editor } from "@tiptap/core";
import logger from "@/lib/logger";
import type { UnifiedLinkAttributes } from "../../tiptap-extensions/unified-link-mark";

/**
 * Update mark to exists state after page creation
 * Converts a missing mark to exists state with the newly created page information
 *
 * @param editor TipTap editor instance
 * @param markId Target mark ID
 * @param pageId Created page ID
 */
export async function updateMarkToExists(
	editor: Editor,
	markId: string,
	pageId: string,
): Promise<void> {
	try {
		const { state, dispatch } = editor.view;
		const { tr } = state;
		const markType = state.schema.marks.unilink;
		let changed = false;

		state.doc.descendants((node, pos: number) => {
			if (!node.isText || !node.text) return;

			for (const mark of node.marks) {
				if (mark.type === markType && mark.attrs.markId === markId) {
					const newAttrs = {
						...mark.attrs,
						state: "exists",
						exists: true,
						pageId,
						href: `/pages/${pageId}`,
						created: true, // Flag indicating newly created page
					} as UnifiedLinkAttributes;

					tr.removeMark(pos, pos + node.text.length, markType);
					tr.addMark(pos, pos + node.text.length, markType.create(newAttrs));
					changed = true;
				}
			}
		});

		if (changed && dispatch) {
			dispatch(tr);
		}
	} catch (error) {
		logger.error(
			{ markId, pageId, error },
			"Failed to update mark to exists state",
		);
	}
}

/**
 * Batch resolve multiple marks
 * Future feature for efficient bulk processing
 * Currently a placeholder for individual processing
 *
 * @param _editor TipTap editor instance (reserved for future implementation)
 * @param markIds Array of mark IDs to resolve
 */
export async function batchResolveMarks(
	_editor: Editor,
	markIds: string[],
): Promise<void> {
	logger.info(
		{ markCount: markIds.length },
		"[UnifiedResolver] Batch resolving marks",
	);

	// TODO: Implement efficient batch resolution
	// Current implementation is a placeholder for individual processing
	for (const markId of markIds) {
		// Add individual resolution logic here
		logger.debug({ markId }, "[UnifiedResolver] Processing mark");
	}
}
