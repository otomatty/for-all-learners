import type { SupabaseClient } from "@supabase/supabase-js";
import type { JSONContent } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import CodeBlockComponent from "@/components/CodeBlockComponent";
import { CustomCodeBlock } from "@/lib/tiptap-extensions/code-block";
import { CustomHeading } from "@/lib/tiptap-extensions/custom-heading";
import {
	CustomBulletList,
	CustomOrderedList,
} from "@/lib/tiptap-extensions/custom-list";
import { TableExtensions } from "@/lib/tiptap-extensions/custom-table";
import { GyazoImage } from "@/lib/tiptap-extensions/gyazo-image";
import { Highlight } from "@/lib/tiptap-extensions/highlight-extension";
import { LatexInlineNode } from "@/lib/tiptap-extensions/latex-inline-node";
import { MarkdownPaste } from "@/lib/tiptap-extensions/markdown-paste";
import { UnifiedLinkMark } from "@/lib/tiptap-extensions/unified-link-mark";
import { useUserIconRenderer } from "@/lib/utils/user-icon-renderer";
import type { Database } from "@/types/database.types";
import { useAutoSave } from "./useAutoSave";
import { useEditorInitializer } from "./useEditorInitializer";
import { useGenerateContent } from "./useGenerateContent";
import { useLinkGroupState } from "./useLinkGroupState";
import { useLinkSync } from "./useLinkSync";
import { usePageSaver } from "./usePageSaver";
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

/**
 * CodeBlockWithCopy
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import/use this constant):
 *   └─ usePageEditorLogic (this file)
 *
 * Dependencies (External files that this constant imports/uses):
 *   ├─ CustomCodeBlock (from @/lib/tiptap-extensions/code-block)
 *   └─ CodeBlockComponent (from @/components/CodeBlockComponent)
 *
 * Related Documentation:
 *   ├─ Migration Log: docs/05_logs/2025_10/20251030_01_prism-to-shiki-migration.md
 *   └─ Issue: docs/01_issues/open/2025_10/20251030_01_prism-language-support.md
 */
// Create a Shiki-based code block extension with optional copy functionality
// Shiki provides built-in syntax highlighting for all languages
const CodeBlockWithCopy = CustomCodeBlock.extend({
	addNodeView() {
		return ReactNodeViewRenderer(CodeBlockComponent);
	},
});

export function usePageEditorLogic({
	page,
	initialContent,
	title,
	setIsLoading,
	setIsGenerating,
	isDirty,
	setIsDirty,
}: UsePageEditorLogicProps) {
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
			// Unified Link Mark handles both [Title] and #tag syntax
			UnifiedLinkMark,
			CustomHeading.configure({ levels: [2, 3, 4, 5, 6] }),
			CustomBulletList,
			CustomOrderedList,
			GyazoImage,
			LatexInlineNode,
			Highlight,
			// Shiki-based code block with copy functionality
			// Automatically supports all programming languages with syntax highlighting
			CodeBlockWithCopy.configure({
				defaultLanguage: "javascript",
				defaultTheme: "tokyo-night",
			}),
			// Table extensions for Markdown table support
			...TableExtensions,
			// Markdown Paste - automatically converts Markdown syntax on paste
			MarkdownPaste.configure({
				enabled: true,
				debug: false, // Set to true for development debugging
			}),
			Placeholder.configure({
				placeholder: "ページ内容を入力してください",
				includeChildren: true,
			}),
		],
		editorProps: {
			attributes: {
				class:
					"focus:outline-none !border-none ring-0 prose prose-sm sm:prose md:prose-lg whitespace-normal break-all mx-auto min-h-[200px] px-3 py-2",
			},
		},
	});

	// Initialize editor content with transformation pipeline
	useEditorInitializer({
		editor,
		initialDoc,
		userId: page.user_id,
	});

	// Render user icons in editor
	useUserIconRenderer(editor);

	// Page saver hook - handles save logic, navigation blocking, and H1 removal
	const { savePage } = usePageSaver(editor, page.id, title, {
		setIsLoading,
		setIsDirty,
	});

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

		// Check if the selection already has a UnifiedLinkMark using TipTap's isActive method
		const hasUnifiedLinkMark = editor.isActive("unifiedLink");

		if (hasUnifiedLinkMark) {
			// If already has UnifiedLinkMark, remove brackets and mark
			editor.chain().focus().unwrapBrackets().run();
		} else {
			// If not marked, wrap with brackets [text]
			// The bracket monitor plugin will automatically apply the mark
			editor.chain().focus().wrapWithBrackets().run();
		}

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

	// Smart thumbnail sync hook
	const { manualSync: manualThumbnailSync } = useSmartThumbnailSync({
		editor,
		pageId: page.id,
		title,
		currentThumbnailUrl: page.thumbnail_url,
		enabled: true, // 常に有効
		debounceMs: 2000, // 2秒のデバウンス（autosaveと同じタイミング）
	});

	// Link synchronization hook (handles both editor updates and save-time sync)
	useLinkSync(editor, page.id, {
		debounceMs: 500,
		debug: false,
	});

	// Phase 1 (Link Group): Update link group state for all links
	useLinkGroupState(editor, page.id);

	// Note: initialContent is already set by useEditorInitializer
	// The previous useEffect that re-set initialContent was redundant and has been removed

	return {
		editor,
		savePage, // 必要であれば外部から直接呼び出すことも可能にする
		handleGenerateContent,
		wrapSelectionWithPageLink,
		splitPage,
		manualThumbnailSync, // 手動サムネイル同期機能
	};
}
