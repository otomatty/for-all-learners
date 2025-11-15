import { useCallback, useEffect, useRef } from "react";

/**
 * Hook to automatically resize textarea based on its content
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ components/pages/page-header.tsx
 *
 * Dependencies:
 *   └─ React hooks (useEffect, useRef)
 *
 * Related Documentation:
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/129
 */

interface UseAutoResizeOptions {
	/**
	 * Minimum height in pixels (default: calculated from line-height)
	 */
	minHeight?: number;
	/**
	 * Maximum height in pixels (default: no limit)
	 */
	maxHeight?: number;
	/**
	 * Whether to adjust height on input events (default: true)
	 */
	adjustOnInput?: boolean;
}

/**
 * Automatically resizes a textarea element based on its content
 *
 * @param _value - The current value of the textarea (used to trigger adjustments on external changes)
 * @param options - Configuration options for auto-resize behavior
 * @returns A ref to attach to the textarea element
 *
 * @example
 * ```tsx
 * const textareaRef = useAutoResize(title, { maxHeight: 200 });
 * <Textarea ref={textareaRef} value={title} onChange={...} />
 * ```
 */
export function useAutoResize(
	value: string,
	options: UseAutoResizeOptions = {},
): React.RefObject<HTMLTextAreaElement | null> {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const prevValueRef = useRef<string>(value);
	const { minHeight, maxHeight, adjustOnInput = true } = options;

	/**
	 * Adjusts the height of the textarea based on its content
	 * scrollHeight automatically accounts for line breaks and multi-line content,
	 * so the height will adjust based on the number of lines
	 */
	const adjustHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		// Reset height to auto to get the correct scrollHeight
		// This ensures scrollHeight reflects the actual content height including:
		// - Line breaks (multiple lines)
		// - Padding
		// - Line height
		// - Font size
		// - Word wrapping
		textarea.style.height = "auto";

		// scrollHeight automatically calculates the height needed for all lines
		// When text wraps to multiple lines, scrollHeight increases accordingly
		let newHeight = textarea.scrollHeight;

		// Apply min height if specified
		if (minHeight !== undefined && newHeight < minHeight) {
			newHeight = minHeight;
		}

		// Apply max height if specified
		if (maxHeight !== undefined && newHeight > maxHeight) {
			newHeight = maxHeight;
			// Enable scrolling when content exceeds max height
			textarea.style.overflowY = "auto";
		} else {
			// Disable scrolling when content fits
			textarea.style.overflowY = "hidden";
		}

		// Set the new height
		// The height will automatically adjust as the number of lines changes
		textarea.style.height = `${newHeight}px`;
	}, [minHeight, maxHeight]);

	// Adjust height when value changes (for external updates) and on mount
	// Height is also adjusted via input events for real-time updates during typing
	useEffect(() => {
		// Only adjust if value actually changed (not just on every render)
		if (prevValueRef.current !== value) {
			prevValueRef.current = value;
			// Use requestAnimationFrame to ensure DOM has updated after value change
			requestAnimationFrame(() => {
				adjustHeight();
			});
		}
	}, [value, adjustHeight]);

	// Adjust height on input events (for real-time updates)
	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea || !adjustOnInput) return;

		const handleInput = () => {
			adjustHeight();
		};

		textarea.addEventListener("input", handleInput);

		return () => {
			textarea.removeEventListener("input", handleInput);
		};
	}, [adjustOnInput, adjustHeight]);

	// Adjust height on window resize (for responsive font sizes)
	useEffect(() => {
		const handleResize = () => {
			adjustHeight();
		};

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, [adjustHeight]);

	return textareaRef;
}
