/**
 * Custom hook to detect text selection on the document and return the selected text and its bounding rectangle.
 * @returns An object containing the selected text, its bounding rectangle, and a function to clear the selection.
 */
import { useCallback, useEffect, useState } from "react";

export interface TextSelectionInfo {
	/** The currently selected text, or null if none. */
	selectedText: string | null;
	/** The bounding rectangle of the selected text, or null if none. */
	selectionRect: DOMRect | null;
}

/**
 * useTextSelection hook
 * @returns TextSelectionInfo & { clearSelection: () => void }
 */
export function useTextSelection(): TextSelectionInfo & {
	clearSelection: () => void;
} {
	const [selectedText, setSelectedText] = useState<string | null>(null);
	const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);

	/**
	 * Clears the current text selection and resets state.
	 */
	const clearSelection = useCallback(() => {
		const selection = window.getSelection();
		if (selection) {
			selection.removeAllRanges();
		}
		setSelectedText(null);
		setSelectionRect(null);
	}, []);

	useEffect(() => {
		const handleMouseUp = () => {
			// 文字列が選択されている場合のみ処理を実行
			const selection = window.getSelection();
			if (!selection) return;
			const text = selection.toString().trim();
			console.debug("[useTextSelection] selected text:", text);
			if (text) {
				// 選択テキストがある場合はバウンディングボックスを計算して状態を更新
				console.debug(
					"[useTextSelection] computing bounding rect for text selection",
				);
				const range = selection.getRangeAt(0);
				let rect = range.getBoundingClientRect();
				if ((rect.width === 0 && rect.height === 0) || Number.isNaN(rect.x)) {
					const clientRects = range.getClientRects();
					if (clientRects.length > 0) {
						rect = clientRects[0];
					}
				}
				setSelectedText(text);
				setSelectionRect(rect);
			} else {
				console.debug(
					"[useTextSelection] no text selected, clearing selection state",
				);
				setSelectedText(null);
				setSelectionRect(null);
			}
		};

		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	return { selectedText, selectionRect, clearSelection };
}
