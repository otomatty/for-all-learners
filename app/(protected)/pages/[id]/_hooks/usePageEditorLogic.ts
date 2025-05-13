import { generatePageInfo } from "@/app/_actions/generatePageInfo";
import { CustomCodeBlock } from "@/lib/tiptap-extensions/code-block";
import { CustomHeading } from "@/lib/tiptap-extensions/custom-heading";
import {
	CustomBulletList,
	CustomOrderedList,
} from "@/lib/tiptap-extensions/custom-list";
import { GyazoImage } from "@/lib/tiptap-extensions/gyazo-image";
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JSONContent } from "@tiptap/core";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

interface UsePageEditorLogicProps {
	page: Database["public"]["Tables"]["pages"]["Row"];
	initialContent?: JSONContent;
	title: string;
	supabase: SupabaseClient<Database>;
	setIsLoading: (loading: boolean) => void;
	setIsGenerating: (generating: boolean) => void;
	isDirty: boolean;
}

export function usePageEditorLogic({
	page,
	initialContent,
	title,
	supabase,
	setIsLoading,
	setIsGenerating,
	isDirty,
}: UsePageEditorLogicProps) {
	const initialDoc: JSONContent = initialContent ??
		(page.content_tiptap as JSONContent) ?? { type: "doc", content: [] };

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: false,
				bulletList: false,
				orderedList: false,
				codeBlock: false,
			}),
			CustomHeading,
			CustomBulletList,
			CustomOrderedList,
			LinkExtension,
			PageLink,
			CustomCodeBlock,
			GyazoImage,
			Placeholder.configure({
				placeholder: "ページ内容を入力してください",
				includeChildren: true,
			}),
		],
		editorProps: {
			attributes: {
				class:
					"focus:outline-none !border-none ring-0 prose prose-sm sm:prose lg:prose-lg mx-auto min-h-[200px] px-3 py-2",
			},
		},
		onCreate({ editor }) {
			console.log("[Client Debug] onCreate initialDoc:", initialDoc);
			editor.commands.setContent(initialDoc);
		},
	});

	const saveTimeout = useRef<NodeJS.Timeout | null>(null);
	const isFirstUpdate = useRef(true);

	const savePage = useCallback(async () => {
		if (!editor) return;
		setIsLoading(true);
		try {
			const content = editor.getJSON() as JSONContent;
			// Extract first Gyazo image and compute raw URL for thumbnail
			let firstImageRawUrl: string | null = null;
			const findGyazoImage = (node: JSONContent): string | null => {
				const attrs = (node as { attrs?: { src?: string } }).attrs;
				if (node.type === "gyazoImage" && attrs?.src) {
					const src = attrs.src;
					const pageUrl = src
						.replace(/^https:\/\/i\.gyazo\.com\//, "https://gyazo.com/")
						.replace(/\.png$/, "");
					return `${pageUrl}/raw`;
				}
				if ("content" in node && Array.isArray(node.content)) {
					for (const child of node.content) {
						const found = findGyazoImage(child as JSONContent);
						if (found) return found;
					}
				}
				return null;
			};
			firstImageRawUrl = findGyazoImage(content);
			const { error } = await supabase
				.from("pages")
				.update({
					title,
					content_tiptap: content,
					thumbnail_url: firstImageRawUrl,
				})
				.eq("id", page.id)
				.select()
				.single();
			if (error) throw error;
			toast.success("ページを保存しました");
		} catch (err) {
			console.error("EditPageForm save error:", err);
			toast.error("保存に失敗しました");
		} finally {
			setIsLoading(false);
		}
	}, [editor, title, page.id, supabase, setIsLoading]);

	const handleGenerateContent = useCallback(async () => {
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
			await savePage(); // 生成後すぐに保存
			toast.success("コンテンツ生成完了");
		} catch (error) {
			console.error("generatePageInfo error:", error);
			toast.error("生成に失敗しました");
		} finally {
			setIsGenerating(false);
		}
	}, [title, editor, savePage, setIsGenerating]);

	// Autosave on editor updates
	useEffect(() => {
		if (!editor) return;
		const onUpdate = () => {
			if (isFirstUpdate.current) {
				isFirstUpdate.current = false;
				return;
			}
			if (saveTimeout.current) clearTimeout(saveTimeout.current);
			saveTimeout.current = setTimeout(savePage, 2000);
		};
		editor.on("update", onUpdate);
		return () => {
			editor.off("update", onUpdate);
			if (saveTimeout.current) clearTimeout(saveTimeout.current);
		};
	}, [savePage, editor]);

	// Autosave on title changes (when dirty)
	useEffect(() => {
		if (!editor || !isDirty) return;
		if (saveTimeout.current) clearTimeout(saveTimeout.current);
		saveTimeout.current = setTimeout(savePage, 2000);
		return () => {
			if (saveTimeout.current) clearTimeout(saveTimeout.current);
		};
	}, [isDirty, savePage, editor]);

	useEffect(() => {
		if (editor && initialContent) {
			editor.commands.setContent(initialContent);
		}
	}, [editor, initialContent]);

	// Debug: log initial content and editor state in browser console
	useEffect(() => {
		if (editor) {
			console.log(
				"[Client Debug] initialContent in usePageEditorLogic:",
				initialContent,
			);
			console.log("[Client Debug] editor JSON:", editor.getJSON());
		}
	}, [editor, initialContent]);

	return {
		editor,
		savePage, // 必要であれば外部から直接呼び出すことも可能にする
		handleGenerateContent,
	};
}
