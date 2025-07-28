import { generatePageInfo } from "@/app/_actions/generatePageInfo";
import type { Editor } from "@tiptap/react";
import { marked } from "marked";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Hook to generate page content based on title.
 */
export function useGenerateContent(
	editor: Editor | null,
	title: string,
	savePage: () => Promise<void>,
	setIsGenerating: (generating: boolean) => void,
) {
	return useCallback(async () => {
		if (!title.trim()) {
			toast.error("タイトルを入力してください");
			return;
		}
		if (!editor) return;

		setIsGenerating(true);
		try {
			const markdown = await generatePageInfo(title);
			const html = marked.parse(markdown);
			editor.commands.setContent(html);
			await savePage();
		} catch (error) {
			console.error("generatePageInfo error:", error);
			toast.error("生成に失敗しました");
		} finally {
			setIsGenerating(false);
		}
	}, [editor, title, savePage, setIsGenerating]);
}
