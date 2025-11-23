import type { Editor } from "@tiptap/react";
import { marked } from "marked";
import { useCallback } from "react";
import { toast } from "sonner";
import { useGeneratePageInfo } from "@/lib/hooks/ai";

/**
 * Hook to generate page content based on title.
 */
export function useGenerateContent(
	editor: Editor | null,
	title: string,
	savePage: () => Promise<void>,
	setIsGenerating: (generating: boolean) => void,
) {
	const generatePageInfoMutation = useGeneratePageInfo();

	return useCallback(async () => {
		if (!title.trim()) {
			toast.error("タイトルを入力してください");
			return;
		}
		if (!editor) return;

		setIsGenerating(true);
		try {
			const response = await generatePageInfoMutation.mutateAsync({
				title,
			});
			const html = marked.parse(response.markdown);
			editor.commands.setContent(html);
			await savePage();
		} catch (error) {
			if (error instanceof Error) {
				toast.error(`生成に失敗しました: ${error.message}`);
			} else {
				toast.error("生成に失敗しました");
			}
		} finally {
			setIsGenerating(false);
		}
	}, [editor, title, savePage, setIsGenerating, generatePageInfoMutation]);
}
