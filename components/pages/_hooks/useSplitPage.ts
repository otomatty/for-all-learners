import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { useCallback } from "react";
import { toast } from "sonner";
import { splitPageSelection } from "@/app/_actions/splitPageSelection";

/**
 * Hook to split selected content into a new page and replace with link.
 */
export function useSplitPage(
	editor: Editor | null,
	pageId: string,
	savePage: () => Promise<void>,
) {
	return useCallback(async () => {
		if (!editor) return;
		const { from, to } = editor.state.selection;
		if (from >= to) {
			toast.error("テキストを選択してページを分割してください");
			return;
		}

		// Serialize selection preserving heading levels
		const fragment = editor.state.doc.slice(from, to).content;
		const contentArray: JSONContent[] = [];
		for (let i = 0; i < fragment.childCount; i++) {
			const node = fragment.child(i);
			const nodeJSON = node.toJSON() as JSONContent;
			if (node.type.name === "heading" && node.attrs?.level) {
				nodeJSON.attrs = { ...(nodeJSON.attrs || {}), level: node.attrs.level };
			}
			contentArray.push(nodeJSON);
		}
		const selectedContent: JSONContent = { type: "doc", content: contentArray };

		// Derive title from first node
		let titleText = "";
		const firstNode = selectedContent.content?.[0];
		if (Array.isArray(firstNode?.content)) {
			titleText = firstNode.content
				.map((child) => ("text" in child ? child.text : ""))
				.join("");
		}
		titleText = titleText.trim() || "新規ページ";

		try {
			const _newPage = await splitPageSelection({
				originalPageId: pageId,
				title: titleText,
				content: selectedContent,
			});
			editor
				.chain()
				.focus()
				.deleteRange({ from, to })
				.insertContentAt(from, `[${titleText}]`)
				.run();
			await savePage();
			toast.success("ページを分割しました");
		} catch (_err) {
			toast.error("ページ分割に失敗しました");
		}
	}, [editor, pageId, savePage]);
}
