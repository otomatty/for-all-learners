/**
 * MarkIndex - エディタ内のUnifiedLinkMarkを効率的に検索・更新
 * P3実装: missing状態のマークをkey別に索引化
 */

import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import logger from "../logger";
import type { UnifiedLinkAttributes } from "../tiptap-extensions/unified-link-mark";

export interface MarkPosition {
	from: number;
	to: number;
	markId: string;
	attrs: UnifiedLinkAttributes;
}

interface MarkIndexState {
	editor: Editor;
	index: Map<string, MarkPosition[]>; // key -> positions
	lastScanTime: number;
	scanThrottleMs: number;
}

/**
 * Create a mark index for efficient unilink mark search and update
 */
export const createMarkIndex = (editor: Editor) => {
	const state: MarkIndexState = {
		editor,
		index: new Map(),
		lastScanTime: 0,
		scanThrottleMs: 100, // Throttle scan frequency
	};

	/**
	 * Get total number of marks across all keys
	 */
	const getTotalMarks = (): number => {
		let count = 0;
		state.index.forEach((positions) => {
			count += positions.length;
		});
		return count;
	};

	/**
	 * Rebuild index by scanning editor document
	 * Throttled to prevent excessive scanning
	 */
	const rebuild = (): void => {
		const now = Date.now();
		if (now - state.lastScanTime < state.scanThrottleMs) {
			logger.debug("[MarkIndex] Skipping rebuild due to throttle");
			return;
		}

		state.index.clear();
		const { state: editorState } = state.editor.view;
		const markType = editorState.schema.marks.unilink;

		if (!markType) {
			logger.warn("[MarkIndex] unilink mark type not found in schema");
			return;
		}

		editorState.doc.descendants((node: ProseMirrorNode, pos: number) => {
			if (!node.isText) return;

			node.marks.forEach((mark) => {
				if (mark.type !== markType) return;

				const attrs = mark.attrs as UnifiedLinkAttributes;

				// Only index marks in 'missing' state
				if (attrs.state !== "missing") return;

				const key = attrs.key;
				if (!key) return;

				const position: MarkPosition = {
					from: pos,
					to: pos + node.nodeSize,
					markId: attrs.markId,
					attrs,
				};

				const existing = state.index.get(key);
				if (existing) {
					existing.push(position);
				} else {
					state.index.set(key, [position]);
				}
			});
		});

		state.lastScanTime = now;
	};

	/**
	 * Get mark positions for a specific key
	 */
	const getPositionsByKey = (key: string): MarkPosition[] => {
		return state.index.get(key) || [];
	};

	/**
	 * Get mark positions for multiple keys
	 */
	const getPositionsByKeys = (keys: string[]): Map<string, MarkPosition[]> => {
		const result = new Map<string, MarkPosition[]>();
		keys.forEach((key) => {
			const positions = getPositionsByKey(key);
			if (positions.length > 0) {
				result.set(key, positions);
			}
		});
		return result;
	};

	/**
	 * Get all keys that have missing marks
	 */
	const getAllKeys = (): string[] => {
		return Array.from(state.index.keys());
	};

	/**
	 * Update marks for a key to 'exists' state
	 * @returns true if any marks were updated
	 */
	const updateToExists = (key: string, pageId: string): boolean => {
		const positions = getPositionsByKey(key);
		if (positions.length === 0) {
			logger.debug({ key }, "[MarkIndex] No positions found for key");
			return false;
		}

		const { state: editorState, dispatch } = state.editor.view;
		const { tr } = editorState;
		const markType = editorState.schema.marks.unilink;
		let changed = false;

		positions.forEach((position) => {
			const newAttrs: UnifiedLinkAttributes = {
				...position.attrs,
				state: "exists",
				exists: true,
				pageId,
				href: `/pages/${pageId}`,
			};

			try {
				tr.removeMark(position.from, position.to, markType);
				tr.addMark(position.from, position.to, markType.create(newAttrs));
				changed = true;
			} catch (error) {
				logger.warn(
					{ key, position, error },
					`[MarkIndex] Failed to update mark at ${position.from}-${position.to}`,
				);
			}
		});

		if (changed && dispatch) {
			dispatch(tr);
			// Remove from index (no longer missing)
			state.index.delete(key);
			logger.info(
				{ key, pageId, marksUpdated: positions.length },
				"[MarkIndex] Marks updated to exists",
			);
		}

		return changed;
	};

	/**
	 * Get index statistics for debugging
	 */
	const getStats = (): {
		uniqueKeys: number;
		totalMarks: number;
		keys: string[];
	} => {
		return {
			uniqueKeys: state.index.size,
			totalMarks: getTotalMarks(),
			keys: getAllKeys(),
		};
	};

	/**
	 * Clear all index data
	 */
	const clear = (): void => {
		const previousSize = state.index.size;
		state.index.clear();
		state.lastScanTime = 0;
		logger.debug({ clearedKeys: previousSize }, "[MarkIndex] Index cleared");
	};

	return {
		rebuild,
		getPositionsByKey,
		getPositionsByKeys,
		getAllKeys,
		updateToExists,
		getStats,
		clear,
	};
};

export type MarkIndex = ReturnType<typeof createMarkIndex>;
