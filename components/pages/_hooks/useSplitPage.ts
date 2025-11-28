import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { useCallback } from "react";
import { toast } from "sonner";
// TODO: API Route `/api/pages/split` を作成して置き換え

/**
 * Hook to split selected content into a new page and replace with link.
 */
export function useSplitPage(
	editor: Editor | null,
	_pageId: string, // TODO: API Route実装時に使用
	_savePage: () => Promise<void>, // TODO: API Route実装時に使用
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
			// TODO: API Route `/api/pages/split` を作成して置き換え
			// const response = await fetch("/api/pages/split", {
			// 	method: "POST",
			// 	headers: { "Content-Type": "application/json" },
			// 	body: JSON.stringify({
			// 		originalPageId: pageId,
			// 		title: titleText,
			// 		content: selectedContent,
			// 	}),
			// });
			// const newPage = await response.json();
			toast.error("ページ分割機能は現在利用できません");
			// editor
			// 	.chain()
			// 	.focus()
			// 	.deleteRange({ from, to })
			// 	.insertContentAt(from, `[${titleText}]`)
			// 	.run();
			// await savePage();
			// toast.success("ページを分割しました");
		} catch (_err) {
			toast.error("ページ分割に失敗しました");
		}
	}, [editor]);
}
