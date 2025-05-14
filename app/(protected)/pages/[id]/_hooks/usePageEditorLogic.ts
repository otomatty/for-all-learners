import { generatePageInfo } from "@/app/_actions/generatePageInfo";
import { CustomCodeBlock } from "@/lib/tiptap-extensions/code-block";
import { CustomHeading } from "@/lib/tiptap-extensions/custom-heading";
import {
	CustomBulletList,
	CustomOrderedList,
} from "@/lib/tiptap-extensions/custom-list";
import { GyazoImage } from "@/lib/tiptap-extensions/gyazo-image";
import {
	PageLink,
	existencePluginKey,
} from "@/lib/tiptap-extensions/page-link";
import { TagLink } from "@/lib/tiptap-extensions/tag-link";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JSONContent } from "@tiptap/core";
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

// Define a text node type to strip legacy link marks
interface JSONTextNode extends JSONContent {
	type: "text";
	text: string;
	marks?: Array<{ type: string; [key: string]: any }>;
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

// Add helper to annotate bracketed text as link marks
function annotateLinksInJSON(
	doc: JSONContent,
	titleIdMap: Map<string, string | null>,
): JSONContent {
	const clone = structuredClone(doc) as JSONContent;
	const regex = /\[([^\[\]]+)\]/g;
	const recurse = (node: JSONContent): JSONContent | JSONContent[] => {
		if (node.type === "text") {
			const textNode = node as { type: "text"; text: string; marks?: any[] };
			const { text, marks } = textNode;
			let lastIndex = 0;
			const nodes: JSONContent[] = [];
			// Find bracket matches sequentially
			let match: RegExpExecArray | null = regex.exec(text);
			while (match) {
				const [full, title] = match;
				const index = match.index;
				if (index > lastIndex) {
					nodes.push({
						type: "text",
						text: text.slice(lastIndex, index),
						marks,
					});
				}
				const pageId = titleIdMap.get(title) ?? null;
				const href = pageId ? `/pages/${pageId}` : "#";
				// Preserve brackets in link text
				nodes.push({
					type: "text",
					text: full,
					marks: [...(marks ?? []), { type: "link", attrs: { href, pageId } }],
				});
				lastIndex = index + full.length;
				// Move to next match
				match = regex.exec(text);
			}
			if (lastIndex < text.length) {
				nodes.push({ type: "text", text: text.slice(lastIndex), marks });
			}
			return nodes.length > 0 ? nodes : [node];
		}
		if ("content" in node && Array.isArray(node.content)) {
			const children = node.content.flatMap((child) => {
				const res = recurse(child as JSONContent);
				return Array.isArray(res) ? res : [res];
			});
			return { ...node, content: children };
		}
		return node;
	};
	clone.content =
		clone.content?.flatMap((child) => {
			const res = recurse(child);
			return Array.isArray(res) ? res : [res];
		}) ?? [];
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
		immediatelyRender: false,
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
			PageLink,
			TagLink,
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
			// 初期ドキュメントを出力
			console.debug(
				"初期ドキュメント(initialDoc):",
				JSON.stringify(initialDoc, null, 2),
			);
			try {
				editor.commands.setContent(sanitized);
			} catch (error) {
				console.error("setContent 失敗:", error);
				console.log(
					"サニタイズされた内容:",
					JSON.stringify(sanitized, null, 2),
				);
				// フォールバック: 空のドキュメントを設定
				editor.commands.setContent({ type: "doc", content: [] });
			}
		},
	});

	const saveTimeout = useRef<NodeJS.Timeout | null>(null);
	const isFirstUpdate = useRef(true);

	const existenceTimeout = useRef<NodeJS.Timeout | null>(null);

	const savePage = useCallback(async () => {
		if (!editor) return;
		setIsLoading(true);
		isSavingRef.current = true;
		try {
			const rawContent = editor.getJSON() as JSONContent;
			// Extract unique titles from bracket syntax
			const fullText = editor.getText();
			// Extract bracketed titles and tag titles (after #)
			const bracketTitles = Array.from(
				fullText.matchAll(/\[([^\[\]]+)\]/g),
				(m) => m[1],
			);
			const tagTitles = Array.from(
				fullText.matchAll(/#([^\s\[\]]+)/g),
				(m) => m[1],
			);
			const titles = Array.from(new Set([...bracketTitles, ...tagTitles]));
			const { data: pages } = await supabase
				.from("pages")
				.select("title,id")
				.in("title", titles as string[]);
			const titleIdMap = new Map<string, string | null>(
				pages?.map((p) => [p.title, p.id]) ?? [],
			);
			// Annotate content with link marks
			const content = annotateLinksInJSON(rawContent, titleIdMap);
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

	// Add wrapSelectionWithPageLink for bubble menu and keyboard shortcuts
	const wrapSelectionWithPageLink = useCallback(async () => {
		if (!editor) return;
		const { from, to } = editor.state.selection;
		const text = editor.state.doc.textBetween(from, to, "");

		if (!text) {
			toast.error("テキストを選択してページリンクを作成してください");
			return;
		}

		// 選択範囲をブラケットで囲むだけに修正
		editor
			.chain()
			.focus()
			.insertContentAt(from, "[")
			.insertContentAt(to + 1, "]")
			.run();
	}, [editor]);

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
			// raw initialContent を出力
			console.debug(
				"raw initialContent:",
				JSON.stringify(initialContent, null, 2),
			);
			// Sanitize initialContent on effect to ensure no invalid nodes
			const sanitized = sanitizeContent(initialContent);
			try {
				editor.commands.setContent(sanitized);
			} catch (error) {
				console.error("initialContent 設定エラー:", error);
				console.log(
					"サニタイズされた initialContent:",
					JSON.stringify(sanitized, null, 2),
				);
			}
		}
	}, [editor, initialContent]);

	// リンク先の存在チェックをエディタ更新時にデバウンス実行
	useEffect(() => {
		if (!editor) return;
		const checkExistence = async () => {
			// テキスト全体を取得
			const fullText = editor.getText();
			// Extract bracketed titles and tag titles (after #)
			const bracketTitles = Array.from(
				fullText.matchAll(/\[([^\[\]]+)\]/g),
				(m) => m[1],
			);
			const tagTitles = Array.from(
				fullText.matchAll(/#([^\s\[\]]+)/g),
				(m) => m[1],
			);
			const titles = Array.from(new Set([...bracketTitles, ...tagTitles]));
			// Build map of title to page ID (null if not exists)
			const existMap = new Map<string, string | null>();
			if (titles.length > 0) {
				const { data: pages } = await supabase
					.from("pages")
					.select("title,id")
					.in("title", titles as string[]);
				const pageMap = new Map<string, string>(
					pages?.map((p) => [p.title, p.id]) ?? [],
				);
				for (const t of titles) {
					existMap.set(t, pageMap.get(t) ?? null);
				}
			}
			// メタ情報としてセット
			const tr = editor.state.tr.setMeta(existencePluginKey, existMap);
			editor.view.dispatch(tr);
		};

		const handler = () => {
			if (existenceTimeout.current) clearTimeout(existenceTimeout.current);
			existenceTimeout.current = setTimeout(checkExistence, 500);
		};

		editor.on("update", handler);
		// 初回チェックを即時実行して、再読み込み時にもリンク状態を反映
		handler();
		return () => {
			editor.off("update", handler);
			if (existenceTimeout.current) clearTimeout(existenceTimeout.current);
		};
	}, [editor, supabase]);

	return {
		editor,
		savePage, // 必要であれば外部から直接呼び出すことも可能にする
		handleGenerateContent,
		wrapSelectionWithPageLink,
	};
}
