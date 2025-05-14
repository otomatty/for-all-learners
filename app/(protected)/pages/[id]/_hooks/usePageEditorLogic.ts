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

/**
 * Remove empty text nodes from a JSONContent document.
 */
function sanitizeContent(doc: JSONContent): JSONContent {
	const clone = structuredClone(doc) as JSONContent;
	const recurse = (node: JSONContent): JSONContent => {
		const newNode = { ...node } as JSONContent;
		if (Array.isArray(newNode.content)) {
			newNode.content = newNode.content.map(recurse);
			if (newNode.type === "paragraph") {
				// Filter out empty or whitespace-only text nodes
				newNode.content = newNode.content.filter((child: JSONContent) => {
					if (child.type === "text" && typeof child.text === "string") {
						return child.text.trim() !== "";
					}
					return true;
				});
				if (newNode.content.length === 0) {
					// Remove empty content property without using delete
					const { content, ...rest } = newNode;
					return rest as JSONContent;
				}
			}
		}
		return newNode;
	};
	clone.content = (clone.content ?? []).map(recurse);
	return clone;
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
	// Track saving state to block navigation
	const isSavingRef = useRef(false);

	// Prevent page unload/navigation while saving
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isSavingRef.current) {
				e.preventDefault();
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, []);

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
			// Sanitize initial document to remove empty text nodes
			const sanitized = sanitizeContent(initialDoc);
			editor.commands.setContent(sanitized);
		},
	});

	const saveTimeout = useRef<NodeJS.Timeout | null>(null);
	const isFirstUpdate = useRef(true);

	const savePage = useCallback(async () => {
		if (!editor) return;
		setIsLoading(true);
		isSavingRef.current = true;
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
		} catch (err) {
			console.error("EditPageForm save error:", err);
			toast.error("保存に失敗しました");
		} finally {
			setIsLoading(false);
			isSavingRef.current = false;
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
			// Sanitize initialContent on effect to ensure no invalid nodes
			const sanitized = sanitizeContent(initialContent);
			editor.commands.setContent(sanitized);
		}
	}, [editor, initialContent]);

	return {
		editor,
		savePage, // 必要であれば外部から直接呼び出すことも可能にする
		handleGenerateContent,
	};
}
