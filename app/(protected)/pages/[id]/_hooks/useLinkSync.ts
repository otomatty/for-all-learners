/**
 * useLinkSync - Unified Link Synchronization Hook
 *
 * This hook manages the synchronization of page links in the editor.
 * It consolidates link sync logic that was previously duplicated in
 * multiple places (editor update handler and savePage function).
 *
 * Features:
 * - Automatic sync on editor updates (with debounce)
 * - Manual sync on demand (for savePage)
 * - Duplicate request prevention
 * - Error handling and logging
 *
 * @module useLinkSync
 */

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { updatePageLinks } from "@/app/_actions/updatePageLinks";
import logger from "@/lib/logger";
import { extractLinkData } from "@/lib/utils/linkUtils";

export interface UseLinkSyncOptions {
	/**
	 * Debounce delay in milliseconds for editor update syncs
	 * @default 500
	 */
	debounceMs?: number;

	/**
	 * Enable debug logging
	 * @default false
	 */
	debug?: boolean;
}

export interface UseLinkSyncReturn {
	/**
	 * Manually trigger link synchronization
	 * @param immediate - If true, skip debounce and sync immediately
	 */
	syncLinks: (immediate?: boolean) => Promise<void>;

	/**
	 * Whether a sync operation is currently in progress
	 */
	isSyncing: boolean;

	/**
	 * Timestamp of the last successful sync (null if never synced)
	 */
	lastSyncTime: number | null;
}

/**
 * Custom hook for managing page link synchronization
 *
 * @param editor - TipTap editor instance
 * @param pageId - Current page ID
 * @param options - Configuration options
 * @returns Sync control functions and state
 *
 * @example
 * ```typescript
 * const { syncLinks, isSyncing } = useLinkSync(editor, page.id);
 *
 * // Manually sync (e.g., before saving)
 * await syncLinks(true); // immediate sync
 *
 * // Auto-sync happens on editor updates (debounced)
 * ```
 */
export function useLinkSync(
	editor: Editor | null,
	pageId: string,
	options: UseLinkSyncOptions = {},
): UseLinkSyncReturn {
	const { debounceMs = 500, debug = false } = options;

	// State
	const [isSyncing, setIsSyncing] = useState(false);
	const lastSyncTimeRef = useRef<number | null>(null);
	const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const hasInitialSyncRef = useRef(false);
	const isSyncingRef = useRef(false);

	/**
	 * Perform the actual sync operation
	 * Prevents duplicate requests using isSyncingRef (not state)
	 * This avoids infinite loops caused by state dependency changes
	 */
	const performSync = useCallback(async () => {
		if (isSyncingRef.current || !editor) {
			if (debug) {
				logger.debug(
					{ pageId, isSyncing: isSyncingRef.current, hasEditor: !!editor },
					"[useLinkSync] Skipping sync (already syncing or no editor)",
				);
			}
			return;
		}

		isSyncingRef.current = true;
		setIsSyncing(true);

		try {
			const json = editor.getJSON();
			const { outgoingIds } = extractLinkData(json);

			if (debug) {
				logger.debug(
					{ pageId, linkCount: outgoingIds.length, outgoingIds },
					"[useLinkSync] Starting link sync",
				);
			}

			await updatePageLinks({ pageId, outgoingIds });

			lastSyncTimeRef.current = Date.now();
			if (!hasInitialSyncRef.current) {
				hasInitialSyncRef.current = true;
			}

			logger.debug(
				{
					pageId,
					linkCount: outgoingIds.length,
					timestamp: lastSyncTimeRef.current,
				},
				"[useLinkSync] Link sync completed successfully",
			);
		} catch (err) {
			logger.error({ err, pageId }, "[useLinkSync] Link sync failed");
		} finally {
			isSyncingRef.current = false;
			setIsSyncing(false);
		}
	}, [editor, pageId, debug]);

	/**
	 * Trigger link synchronization with optional debounce
	 * @param immediate - If true, sync immediately without debounce
	 */
	const syncLinks = useCallback(
		async (immediate = false) => {
			// Determine delay: immediate sync or initial sync has no delay
			const delay = immediate || !hasInitialSyncRef.current ? 0 : debounceMs;

			if (debug) {
				logger.debug(
					{
						pageId,
						immediate,
						delay,
						hasInitialSync: hasInitialSyncRef.current,
					},
					"[useLinkSync] Scheduling sync",
				);
			}

			// Clear any pending sync
			if (syncTimeoutRef.current) {
				clearTimeout(syncTimeoutRef.current);
			}

			// Schedule sync
			syncTimeoutRef.current = setTimeout(() => {
				performSync();
			}, delay);
		},
		[performSync, debounceMs, pageId, debug],
	);

	/**
	 * Set up automatic sync on editor updates
	 */
	useEffect(() => {
		if (!editor || typeof editor.on !== "function") {
			if (debug && editor) {
				logger.debug(
					{ pageId },
					"[useLinkSync] Editor missing required methods",
				);
			}
			return;
		}

		logger.debug({ pageId }, "[useLinkSync] Setting up editor update listener");

		// Handler for editor updates (debounced)
		const updateHandler = () => {
			syncLinks(false);
		};

		// Register event listener
		editor.on("update", updateHandler);

		// Perform initial sync immediately
		syncLinks(true);

		// Cleanup
		return () => {
			logger.debug(
				{ pageId },
				"[useLinkSync] Cleaning up editor update listener",
			);
			editor.off("update", updateHandler);
			if (syncTimeoutRef.current) {
				clearTimeout(syncTimeoutRef.current);
			}
		};
	}, [editor, pageId]);

	return {
		syncLinks,
		isSyncing,
		lastSyncTime: lastSyncTimeRef.current,
	};
}
