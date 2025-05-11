import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import { CustomHeading } from "@/lib/tiptap-extensions/custom-heading";
import {
	CustomBulletList,
	CustomOrderedList,
} from "@/lib/tiptap-extensions/custom-list";
import type { JSONContent } from "@tiptap/core";
import type { Database } from "@/types/database.types";
import Placeholder from "@tiptap/extension-placeholder";
import { generatePageInfo } from "@/app/_actions/generatePageInfo";
import { marked } from "marked";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

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
			}),
			CustomHeading,
			CustomBulletList,
			CustomOrderedList,
			LinkExtension,
			PageLink,
			Placeholder.configure({
				placeholder: "ページ内容を入力してください",
				includeChildren: true,
			}),
		],
		content: initialDoc,
		editorProps: {
			attributes: {
				class:
					"focus:outline-none !border-none ring-0 prose prose-sm sm:prose lg:prose-lg mx-auto min-h-[200px] px-3 py-2",
			},
		},
	});

	const saveTimeout = useRef<NodeJS.Timeout | null>(null);
	const isFirstUpdate = useRef(true);

	const savePage = useCallback(async () => {
		if (!editor) return;
		setIsLoading(true);
		try {
			const content = editor.getJSON() as JSONContent;
			const { error } = await supabase
				.from("pages")
				.update({ title, content_tiptap: content })
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

	return {
		editor,
		savePage, // 必要であれば外部から直接呼び出すことも可能にする
		handleGenerateContent,
	};
}
