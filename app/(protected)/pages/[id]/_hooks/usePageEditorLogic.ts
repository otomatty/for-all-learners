import { CustomHeading } from "@/lib/tiptap-extensions/custom-heading";
import {
	CustomBulletList,
	CustomOrderedList,
} from "@/lib/tiptap-extensions/custom-list";
import { TableExtensions } from "@/lib/tiptap-extensions/custom-table";
import { GyazoImage } from "@/lib/tiptap-extensions/gyazo-image";
import { Highlight } from "@/lib/tiptap-extensions/highlight-extension";
import { LatexInlineNode } from "@/lib/tiptap-extensions/latex-inline-node";
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import { TagLink } from "@/lib/tiptap-extensions/tag-link";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JSONContent } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import CodeBlockComponent from "@/components/CodeBlockComponent";
import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockPrism from "tiptap-extension-code-block-prism";

import { ensurePageLinksSync } from "@/app/_actions/ensurePageLinksSync";
import { updatePage } from "@/app/_actions/updatePage";
import { updatePageLinks } from "@/app/_actions/updatePageLinks";
import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";
import { extractLinkData } from "@/lib/utils/linkUtils";
import { transformMarkdownTables } from "@/lib/utils/transformMarkdownTables";
import { useAutoSave } from "./useAutoSave";
import { useGenerateContent } from "./useGenerateContent";
import { useLinkExistenceChecker } from "./useLinkExistenceChecker";
import { useSmartThumbnailSync } from "./useSmartThumbnailSync";
import { useSplitPage } from "./useSplitPage";

interface UsePageEditorLogicProps {
	page: Database["public"]["Tables"]["pages"]["Row"];
	initialContent?: JSONContent;
	title: string;
	supabase: SupabaseClient<Database>;
	setIsLoading: (loading: boolean) => void;
	setIsGenerating: (generating: boolean) => void;
	isDirty: boolean;
	setIsDirty: (dirty: boolean) => void;
	noteSlug?: string;
}

// Define a text node type to strip legacy link marks
interface JSONTextNode extends JSONContent {
	type: "text";
	text: string;
	marks?: Array<{ type: string; [key: string]: unknown }>;
}

/**
 * Remove empty text nodes from a JSONContent document.
 */
function sanitizeContent(doc: JSONContent): JSONContent {
	const clone = structuredClone(doc) as JSONContent;
	const recurse = (node: JSONContent): JSONContent => {
		const newNode = { ...node } as JSONContent;
		// Legacy link and pageLink marks を除去
		if (newNode.type === "text") {
			const textNode = newNode as JSONTextNode;
			if (Array.isArray(textNode.marks)) {
				const filtered = textNode.marks.filter(
					(mark: { type: string }) =>
						mark.type !== "link" && mark.type !== "pageLink",
				);
				if (filtered.length > 0) {
					textNode.marks = filtered;
				} else {
					const { marks, ...rest } = textNode;
					return rest as JSONContent;
				}
			}
		}
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

/**
 * Convert inline LaTeX syntax ($...$) in text nodes to latexInlineNode nodes.
 */
function transformDollarInDoc(doc: JSONContent): JSONContent {
	const clone = structuredClone(doc) as JSONContent;
	const regex = /\$([^$]+)\$/g;

	function transformNode(node: JSONContent): JSONContent[] {
		// Text node: split by $...$
		if (node.type === "text") {
			const textNode = node as JSONTextNode;
			const { text, marks } = textNode;
			const nodes: JSONContent[] = [];
			let lastIndex = 0;
			let match = regex.exec(text);
			while (match !== null) {
				const [full, content] = match;
				const index = match.index;
				if (index > lastIndex) {
					nodes.push({
						type: "text",
						text: text.slice(lastIndex, index),
						marks,
					});
				}
				nodes.push({
					type: "latexInlineNode",
					attrs: { content },
				} as JSONContent);
				lastIndex = index + full.length;
				match = regex.exec(text);
			}
			if (lastIndex < text.length) {
				nodes.push({ type: "text", text: text.slice(lastIndex), marks });
			}
			return nodes.length > 0 ? nodes : [node];
		}
		// Recursively transform children
		if ("content" in node && Array.isArray(node.content)) {
			const transformedChildren = node.content.flatMap((child) =>
				transformNode(child as JSONContent),
			);
			return [{ ...node, content: transformedChildren }];
		}
		return [node];
	}

	clone.content =
		clone.content?.flatMap((child) => transformNode(child as JSONContent)) ??
		[];
	return clone;
}

// Create a Prism-based code block extension with a React NodeView
const CodeBlockWithCopy = CodeBlockPrism.extend({
	addNodeView() {
		return ReactNodeViewRenderer(CodeBlockComponent);
	},
});

export function usePageEditorLogic({
	page,
	initialContent,
	title,
	supabase,
	setIsLoading,
	setIsGenerating,
	isDirty,
	setIsDirty,
	noteSlug,
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
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: false,
				bulletList: false,
				orderedList: false,
				codeBlock: false,
			}),
			CustomHeading.configure({ levels: [2, 3, 4, 5, 6] }),
			CustomBulletList,
			CustomOrderedList,
			GyazoImage,
			PageLink.configure({ noteSlug }),
			TagLink,
			LatexInlineNode,
			Highlight,
			CodeBlockWithCopy.configure({
				defaultLanguage: "javascript",
			}),
			// Table extensions for Markdown table support
			...TableExtensions,
			// Code blocks highlighted via Prism
			// Prism highlighting is applied on editor updates
			Placeholder.configure({
				placeholder: "ページ内容を入力してください",
				includeChildren: true,
			}),
		],
		editorProps: {
			attributes: {
				class:
					"focus:outline-none !border-none ring-0 prose prose-sm sm:prose lg:prose-lg whitespace-normal break-all mx-auto min-h-[200px] px-3 py-2",
			},
		},
		onCreate({ editor }) {
			// Sanitize initial document to remove empty text nodes
			const sanitized = sanitizeContent(initialDoc);

			// Convert inline LaTeX syntax in sanitized document
			const withLatex = transformDollarInDoc(sanitized);

			// Convert Markdown tables to table nodes
			const withTables = transformMarkdownTables(withLatex);

			try {
				editor.commands.setContent(withTables);
			} catch (error) {
				console.error("setContent 失敗:", error);

				// フォールバック: 空のドキュメントを設定
				editor.commands.setContent({ type: "doc", content: [] });
			}
		},
	});

	const savePage = useCallback(async () => {
		if (!editor) return;
		setIsLoading(true);
		isSavingRef.current = true;
		try {
			// Get editor content and remove H1
			let content = editor.getJSON() as JSONContent;
			// Remove heading level 1 nodes by converting them to paragraphs
			const removeHeading1 = (doc: JSONContent): JSONContent => {
				const recurse = (node: JSONContent): JSONContent => {
					if (node.type === "heading") {
						// Access attrs with proper type
						const attrs = (node as JSONContent & { attrs?: { level: number } })
							.attrs;
						const level = attrs?.level;
						if (!level || level === 1) {
							return {
								type: "paragraph",
								content: node.content,
							} as JSONContent;
						}
					}
					if (Array.isArray(node.content)) {
						return {
							...node,
							content: node.content.map(recurse),
						};
					}
					return node;
				};
				return {
					...doc,
					content: doc.content?.map(recurse),
				} as JSONContent;
			};
			content = removeHeading1(content);

			// 1. ページ保存
			await updatePage({
				id: page.id,
				title,
				content: JSON.stringify(content),
			});

			// 2. リンク同期（確実に完了を待つ）
			const { outgoingIds } = extractLinkData(content);
			await updatePageLinks({ pageId: page.id, outgoingIds });

			// 3. existence mapを強制更新
			try {
				const result = await ensurePageLinksSync(page.id);
				const existMap = new Map<string, string | null>(
					Object.entries(result.existMap),
				);
				const tr = editor.state.tr.setMeta(existencePluginKey, existMap);
				editor.view.dispatch(tr);
			} catch (syncError) {
				console.warn("リンク存在確認の更新に失敗:", syncError);
				// 重要ではないのでエラーは表示しない
			}
		} catch (err) {
			console.error("SavePage error:", err);
			toast.error("保存に失敗しました");
		} finally {
			setIsLoading(false);
			isSavingRef.current = false;
			// 保存完了後はdirtyをリセット
			setIsDirty(false);
		}
	}, [editor, title, page.id, setIsLoading, setIsDirty]);

	// Content generation hook
	const handleGenerateContent = useGenerateContent(
		editor,
		title,
		savePage,
		setIsGenerating,
	);

	// Callback to toggle page link brackets for selected text
	const wrapSelectionWithPageLink = useCallback(() => {
		if (!editor) return;
		const { from, to } = editor.state.selection;
		if (from >= to) {
			toast.error("リンクを作成するにはテキストを選択してください");
			return;
		}

		const selectedText = editor.state.doc.textBetween(from, to, "");

		// Check if the selected text is already wrapped in brackets
		const bracketPattern = /^\[(.+)\]$/;
		const match = selectedText.match(bracketPattern);

		let newText: string;
		if (match) {
			// If already wrapped in brackets, remove them
			newText = match[1];
		} else {
			// If not wrapped, add brackets
			newText = `[${selectedText}]`;
		}

		editor
			.chain()
			.focus()
			.deleteRange({ from, to })
			.insertContentAt(from, newText)
			.run();

		// エディターコンテンツが変更されたのでdirtyにする
		setIsDirty(true);
	}, [editor, setIsDirty]);

	// Callback for splitting page into a new page
	const splitPage = useSplitPage(editor, page.id, savePage);

	// エディターコンテンツ変更の監視
	useEffect(() => {
		if (!editor) return;

		const handleUpdate = () => {
			// エディターコンテンツが変更されたらdirtyにする
			setIsDirty(true);
		};

		editor.on("update", handleUpdate);

		return () => {
			editor.off("update", handleUpdate);
		};
	}, [editor, setIsDirty]);

	// Autosave hook
	useAutoSave(editor, savePage, isDirty);

	// Link existence check hook
	useLinkExistenceChecker(editor, supabase);

	// Smart thumbnail sync hook
	const { manualSync: manualThumbnailSync } = useSmartThumbnailSync({
		editor,
		pageId: page.id,
		title,
		currentThumbnailUrl: page.thumbnail_url,
		enabled: true, // 常に有効
		debounceMs: 2000, // 2秒のデバウンス（autosaveと同じタイミング）
	});

	// Client-side link synchronization hook
	const linkSyncTimeout = useRef<NodeJS.Timeout | null>(null);
	const hasInitialLinkSync = useRef<boolean>(false);

	useEffect(() => {
		if (!editor) return;

		const syncLinks = async (immediate = false) => {
			try {
				const json = editor.getJSON() as JSONContent;
				const { outgoingIds } = extractLinkData(json);
				await updatePageLinks({ pageId: page.id, outgoingIds });

				if (!hasInitialLinkSync.current) {
					hasInitialLinkSync.current = true;
				}
			} catch (err) {
				console.error("リンク同期エラー:", err);
			}
		};

		const debouncedSyncLinks = (immediate = false) => {
			// 初回またはimmediateフラグがtrueの場合は即座に実行
			const delay = immediate || !hasInitialLinkSync.current ? 0 : 500;

			if (linkSyncTimeout.current) clearTimeout(linkSyncTimeout.current);
			linkSyncTimeout.current = setTimeout(() => syncLinks(immediate), delay);
		};

		const updateHandler = () => debouncedSyncLinks(false);

		editor.on("update", updateHandler);

		// Initial sync - 即座に実行
		debouncedSyncLinks(true);

		return () => {
			editor.off("update", updateHandler);
			if (linkSyncTimeout.current) clearTimeout(linkSyncTimeout.current);
		};
	}, [editor, page.id]);

	useEffect(() => {
		if (editor && initialContent) {
			// Sanitize initialContent on effect to ensure no invalid nodes
			const sanitized = sanitizeContent(initialContent);
			try {
				editor.commands.setContent(sanitized);
			} catch (error) {
				console.error("initialContent 設定エラー:", error);
			}
		}
	}, [editor, initialContent]);

	return {
		editor,
		savePage, // 必要であれば外部から直接呼び出すことも可能にする
		handleGenerateContent,
		wrapSelectionWithPageLink,
		splitPage,
		manualThumbnailSync, // 手動サムネイル同期機能
	};
}
