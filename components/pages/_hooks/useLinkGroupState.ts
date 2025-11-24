"use client";

/**
 * Link Group State Hook
 * Updates UnifiedLinkMark attributes with link group information
 *
 * Related Documentation:
 * - Spec: docs/01_issues/open/2025_10/20251026_01_link-group-and-network-feature.md
 * - Phase: Phase 1 - Link Group Foundation
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを使用している場所):
 *   └─ app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts
 *
 * Dependencies (このファイルが使用している外部ファイル):
 *   ├─ app/_actions/linkGroups.ts (getLinkGroupInfo)
 *   ├─ lib/utils/extractLinksFromContent.ts (getUniqueLinkKeys)
 *   └─ lib/utils/determineLinkState.ts (determineLinkState)
 */

import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useRef } from "react";
import logger from "@/lib/logger";
import { getLinkGroupInfoByKeys } from "@/lib/services/linkGroupService";
import { createClient } from "@/lib/supabase/client";
import { determineLinkState } from "@/lib/utils/determineLinkState";
import { getUniqueLinkKeys } from "@/lib/utils/extractLinksFromContent";

/**
 * Hook to update link group state in editor
 * Fetches link group information and updates UnifiedLinkMark attributes
 *
 * @param editor - TipTap editor instance
 * @param pageId - Current page ID
 */
export function useLinkGroupState(editor: Editor | null, pageId: string) {
	const isUpdatingRef = useRef(false);
	const supabase = createClient();

	const updateLinkGroupState = useCallback(async () => {
		if (!editor || isUpdatingRef.current) return;

		try {
			isUpdatingRef.current = true;

			// 1. Extract all unique link keys from editor content
			const content = editor.getJSON();
			const linkKeys = getUniqueLinkKeys(content);

			if (linkKeys.length === 0) {
				return;
			}

			logger.debug(
				{ pageId, linkKeys },
				"[useLinkGroupState] Fetching link group info",
			);

			// 2. Fetch link group information for all keys
			const linkGroupInfoMap = await getLinkGroupInfoByKeys(supabase, linkKeys);

			// 3. Update all UnifiedLinkMark nodes with link group information
			const { state, dispatch } = editor.view;
			const { tr } = state;
			let updated = false;

			state.doc.descendants((node, pos) => {
				// Skip code blocks - they cannot contain marks
				if (node.type.name === "codeBlock") {
					return false; // Don't descend into code blocks
				}

				// Find all text nodes with UnifiedLinkMark
				if (!node.isText) return;

				const unilinkMark = node.marks.find(
					(mark) => mark.type.name === "unilink",
				);
				if (!unilinkMark) return;

				const { key } = unilinkMark.attrs;
				const groupInfo = linkGroupInfoMap.get(key);

				if (!groupInfo) return;

				// Determine group state
				const groupState = determineLinkState(
					groupInfo.pageId,
					groupInfo.linkCount,
				);

				// Update mark attributes if groupState has changed
				if (unilinkMark.attrs.groupState !== groupState) {
					const newAttrs = {
						...unilinkMark.attrs,
						linkGroupId: groupInfo.linkGroupId,
						groupState,
						linkCount: groupInfo.linkCount,
						pageId: groupInfo.pageId,
					};

					const newMarks = node.marks
						.filter((m) => m !== unilinkMark)
						.concat(unilinkMark.type.create(newAttrs));

					tr.removeMark(pos, pos + node.nodeSize, unilinkMark.type);
					tr.addMark(pos, pos + node.nodeSize, newMarks[newMarks.length - 1]);
					updated = true;
				}
			});

			if (updated) {
				dispatch(tr);
				logger.debug(
					{ pageId },
					"[useLinkGroupState] Updated link group states",
				);
			}
		} catch (error) {
			logger.error(
				{ pageId, error },
				"[useLinkGroupState] Failed to update link group state",
			);
		} finally {
			isUpdatingRef.current = false;
		}
	}, [editor, pageId, supabase]);

	// Update link group state on editor content changes
	useEffect(() => {
		if (!editor) return;

		// Initial update
		updateLinkGroupState();

		// Update on editor update (debounced)
		const timeoutId = setTimeout(() => {
			updateLinkGroupState();
		}, 1000); // 1 second debounce

		return () => {
			clearTimeout(timeoutId);
		};
	}, [editor, updateLinkGroupState]);

	return { updateLinkGroupState };
}
