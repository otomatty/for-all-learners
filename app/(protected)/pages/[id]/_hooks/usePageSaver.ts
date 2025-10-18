/**
 * usePageSaver - Page Saving Hook
 *
 * This hook manages the page saving process, including:
 * - Content preparation (H1 removal)
 * - Save state management
 * - Navigation blocking during save
 * - Error handling and user feedback
 *
 * The hook consolidates save logic that was previously scattered
 * across usePageEditorLogic and provides a clean interface for
 * saving page content.
 *
 * @module usePageSaver
 */

import type { Editor, JSONContent } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { updatePage } from "@/app/_actions/updatePage";
import logger from "@/lib/logger";
import { removeH1Headings } from "@/lib/utils/editor/heading-remover";

export interface UsePageSaverOptions {
	/**
	 * Callback fired when save succeeds
	 */
	onSaveSuccess?: () => void;

	/**
	 * Callback fired when save fails
	 */
	onSaveError?: (error: Error) => void;

	/**
	 * Callback to set loading state in parent component
	 */
	setIsLoading?: (loading: boolean) => void;

	/**
	 * Callback to reset dirty state after successful save
	 */
	setIsDirty?: (dirty: boolean) => void;
}

export interface UsePageSaverReturn {
	/**
	 * Save the current editor content to the database
	 */
	savePage: () => Promise<void>;

	/**
	 * Whether a save operation is currently in progress
	 */
	isSaving: boolean;
}

/**
 * Hook to manage page saving with proper state management and navigation blocking
 *
 * Features:
 * - Automatic H1 removal before save
 * - Navigation blocking during save (beforeunload + Next.js router)
 * - Comprehensive error handling
 * - State management for UI feedback
 *
 * @param editor - The TipTap editor instance
 * @param pageId - The ID of the page being edited
 * @param title - The current page title
 * @param options - Optional callbacks and settings
 * @returns Save function and saving state
 *
 * @example
 * ```typescript
 * const { savePage, isSaving } = usePageSaver(editor, page.id, title, {
 *   setIsLoading,
 *   setIsDirty,
 *   onSaveSuccess: () => console.log("Saved!"),
 * });
 * ```
 */
export function usePageSaver(
	editor: Editor | null,
	pageId: string,
	title: string,
	options: UsePageSaverOptions = {},
): UsePageSaverReturn {
	const { onSaveSuccess, onSaveError, setIsLoading, setIsDirty } = options;

	const [isSaving, setIsSaving] = useState(false);
	const isSavingRef = useRef(false);
	const onSaveSuccessRef = useRef(onSaveSuccess);
	const onSaveErrorRef = useRef(onSaveError);
	const setIsLoadingRef = useRef(setIsLoading);
	const setIsDirtyRef = useRef(setIsDirty);

	// Update refs when callbacks change (without triggering re-renders)
	useEffect(() => {
		onSaveSuccessRef.current = onSaveSuccess;
		onSaveErrorRef.current = onSaveError;
		setIsLoadingRef.current = setIsLoading;
		setIsDirtyRef.current = setIsDirty;
	}, [onSaveSuccess, onSaveError, setIsLoading, setIsDirty]);

	/**
	 * Save the current editor content
	 *
	 * This function:
	 * 1. Gets the current editor content
	 * 2. Removes H1 headings (reserved for page title)
	 * 3. Saves to the database via updatePage action
	 * 4. Handles errors and provides user feedback
	 * 5. Resets dirty state on success
	 */
	const savePage = useCallback(async () => {
		if (!editor) {
			logger.warn({ pageId }, "savePage called but editor is null");
			return;
		}

		setIsSaving(true);
		isSavingRef.current = true;
		setIsLoadingRef.current?.(true);

		try {
			// Get editor content
			let content = editor.getJSON() as JSONContent;

			// Remove H1 headings (they should only appear as page title)
			content = removeH1Headings(content);

			// Save page content to database
			await updatePage({
				id: pageId,
				title,
				content: JSON.stringify(content),
			});

			// Success callbacks
			onSaveSuccessRef.current?.();
			setIsDirtyRef.current?.(false);

			logger.info({ pageId }, "Page saved successfully");
		} catch (err) {
			logger.error({ err, pageId }, "Failed to save page");
			toast.error("保存に失敗しました");
			onSaveErrorRef.current?.(err as Error);
		} finally {
			setIsSaving(false);
			isSavingRef.current = false;
			setIsLoadingRef.current?.(false);
		}
	}, [editor, pageId, title]);

	/**
	 * Block browser navigation (page refresh, close, etc.) during save
	 */
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isSavingRef.current) {
				e.preventDefault();
				// Modern browsers ignore custom messages, but setting returnValue is required
				e.returnValue = "";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, []);

	/**
	 * Block Next.js router navigation during save
	 *
	 * Note: Next.js App Router doesn't have a built-in way to block navigation.
	 * This is a known limitation. For now, we only block beforeunload events.
	 * In the future, we could implement a custom solution using route interceptors
	 * or a confirmation dialog.
	 *
	 * @see https://github.com/vercel/next.js/discussions/41934
	 */
	useEffect(() => {
		// TODO: Implement Next.js router navigation blocking
		// This is left as a placeholder for future enhancement
		// Current implementation only blocks beforeunload events

		return () => {
			// Cleanup if needed
		};
	}, []);

	return {
		savePage,
		isSaving,
	};
}
