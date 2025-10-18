import type { Editor } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { dateFormatters } from "@/lib/tiptap-extensions/formatDate";

/**
 * Hook to cycle through date formats and insert today's date in the Tiptap editor on Ctrl+T / Cmd+T.
 */
export function useDateShortcut(editor: Editor | null) {
	const [formatIndex, setFormatIndex] = useState(0);
	// Track the last inserted date range [from, to]
	const lastRangeRef = useRef<{ from: number; to: number } | null>(null);
	const handleDateShortcut = useCallback(() => {
		if (!editor) return;
		const { from, to, empty } = editor.state.selection;
		const formatted = dateFormatters[formatIndex](new Date());
		if (empty && lastRangeRef.current && lastRangeRef.current.to === from) {
			// Replace previous insertion
			const { from: prevFrom, to: prevTo } = lastRangeRef.current;
			editor
				.chain()
				.focus()
				.deleteRange({ from: prevFrom, to: prevTo })
				.insertContent(formatted)
				.run();
			// Update range to new insertion
			lastRangeRef.current = {
				from: prevFrom,
				to: prevFrom + formatted.length,
			};
		} else {
			// Fresh insertion
			editor.chain().focus().insertContent(formatted).run();
			lastRangeRef.current = { from, to: from + formatted.length };
		}
		setFormatIndex((formatIndex + 1) % dateFormatters.length);
	}, [editor, formatIndex]);
	return handleDateShortcut;
}
