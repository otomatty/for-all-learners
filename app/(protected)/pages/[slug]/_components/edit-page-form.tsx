"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import { CustomHeading } from "@/lib/tiptap-extensions/custom-heading";
import type { JSONContent } from "@tiptap/core";
import type { Database } from "@/types/database.types";
import Placeholder from "@tiptap/extension-placeholder";
import { Sparkles } from "lucide-react";
import { generatePageInfo } from "@/app/_actions/generatePageInfo";
import { marked } from "marked";

interface EditPageFormProps {
	page: Database["public"]["Tables"]["pages"]["Row"];
	userId: string;
	/** Initial JSONContent with pageId marks injected */
	initialContent?: JSONContent;
}

export default function EditPageForm({
	page,
	userId,
	initialContent,
}: EditPageFormProps) {
	const router = useRouter();
	const supabase = createClient();
	// Determine content for editor: use injected initialContent or original
	const initialDoc: JSONContent = initialContent ??
		(page.content_tiptap as JSONContent) ?? { type: "doc", content: [] };
	const [title, setTitle] = useState(page.title);
	const [isLoading, setIsLoading] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

	// タイトルからGemini生成を呼び出すハンドラー
	const handleGenerate = useCallback(async () => {
		if (!title.trim()) {
			toast.error("まずタイトルを入力してよ");
			return;
		}
		if (!editor) return;
		setIsGenerating(true);
		try {
			// サーバーで生成されたMarkdownを取得
			const markdown = await generatePageInfo(title);
			// MarkdownをHTMLに変換
			const html = marked.parse(markdown);
			// HTMLコンテンツをエディタにセット
			editor.commands.setContent(html);
			toast.success("コンテンツ生成完了");
		} catch (error) {
			console.error("generatePageInfo error:", error);
			toast.error("生成に失敗しました");
		} finally {
			setIsGenerating(false);
		}
	}, [title]);

	// Ref for debounce timer
	const saveTimeout = useRef<NodeJS.Timeout | null>(null);
	// Debounced save function for autosave
	const savePage = useCallback(async () => {
		if (!editor) return;
		setIsLoading(true);
		try {
			const content = editor.getJSON() as JSONContent;
			const { data: updated, error } = await supabase
				.from("pages")
				.update({ title, content_tiptap: content })
				.eq("id", page.id)
				.select()
				.single();
			if (error) throw error;
			toast.success("ページを保存しました");
			// Redirect to page by ID to preserve slug
			if (updated.id) {
				router.push(`/pages/${encodeURIComponent(updated.id)}`);
			} else {
				router.refresh();
			}
		} catch (err) {
			console.error("EditPageForm save error:", err);
			toast.error("保存に失敗しました");
		} finally {
			setIsLoading(false);
		}
	}, [title, page.id, supabase, router]);
	// Autosave on editor updates
	useEffect(() => {
		if (!editor) return;
		const onUpdate = () => {
			if (saveTimeout.current) clearTimeout(saveTimeout.current);
			saveTimeout.current = setTimeout(savePage, 2000);
		};
		editor.on("update", onUpdate);
		return () => {
			editor.off("update", onUpdate);
			if (saveTimeout.current) clearTimeout(saveTimeout.current);
		};
	}, [savePage]);
	// Autosave on title changes
	useEffect(() => {
		if (saveTimeout.current) clearTimeout(saveTimeout.current);
		saveTimeout.current = setTimeout(savePage, 2000);
		return () => {
			if (saveTimeout.current) clearTimeout(saveTimeout.current);
		};
	}, [savePage]);

	// Offline detection state (SSR safe)
	const [isOnline, setIsOnline] = useState<boolean>(true);
	useEffect(() => {
		// set initial status on client
		setIsOnline(navigator.onLine);
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({ heading: false }),
			CustomHeading,
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

	// Function to wrap selection with pageLink mark
	const wrapSelectionWithPageLink = () => {
		if (!editor) return;
		const { from, to } = editor.state.selection;
		const text = editor.state.doc.textBetween(from, to, "");
		if (!text) {
			toast.error("テキストを選択してページリンクを作成してください");
			return;
		}
		editor
			.chain()
			.focus()
			.toggleMark("pageLink", { pageName: text, pageId: null })
			.run();
	};

	return (
		<>
			<div className="space-y-6 max-w-3xl mx-auto">
				<div className="flex items-center">
					<Input
						value={title}
						onChange={(e) => {
							const newTitle = e.target.value;
							setTitle(newTitle);
							// 初期タイトル(page.title)と比較して変更状態を更新
							setIsDirty(newTitle.trim() !== page.title.trim());
						}}
						placeholder="ページタイトルを入力"
						variant="borderless"
						className="text-4xl font-bold flex-1"
					/>
					{/* 変更があったときのみ表示し、左からフェードイン */}
					<button
						type="button"
						onClick={handleGenerate}
						disabled={isGenerating || !isDirty}
						title="タイトルからコンテンツ生成"
						className={`ml-2 p-1 rounded hover:bg-gray-100 transition-all duration-300 ease-out ${
							isDirty
								? "opacity-100 translate-x-0 visible"
								: "opacity-0 -translate-x-4 invisible"
						}`}
					>
						<Sparkles
							className={`w-10 h-10 text-yellow-500 ${isGenerating ? "animate-spin" : ""}`}
						/>
					</button>
				</div>
				{editor && (
					<div className="relative">
						<BubbleMenu
							editor={editor}
							shouldShow={({ state }) => {
								const { from, to } = state.selection;
								return from < to;
							}}
							tippyOptions={{ duration: 100 }}
						>
							<div className="flex space-x-1 bg-white shadow-md rounded p-1">
								<button
									type="button"
									onClick={() =>
										editor.chain().focus().toggleHeading({ level: 1 }).run()
									}
									className="px-2 py-1 hover:bg-gray-100"
								>
									H1
								</button>
								<button
									type="button"
									onClick={() =>
										editor.chain().focus().toggleHeading({ level: 2 }).run()
									}
									className="px-2 py-1 hover:bg-gray-100"
								>
									H2
								</button>
								<button
									type="button"
									onClick={() =>
										editor.chain().focus().toggleHeading({ level: 3 }).run()
									}
									className="px-2 py-1 hover:bg-gray-100"
								>
									H3
								</button>
								<button
									type="button"
									onClick={() =>
										editor.chain().focus().toggleBulletList().run()
									}
									className="px-2 py-1 hover:bg-gray-100"
								>
									UL
								</button>
								<button
									type="button"
									onClick={wrapSelectionWithPageLink}
									className="px-2 py-1 hover:bg-gray-100"
								>
									Link
								</button>
							</div>
						</BubbleMenu>
						<EditorContent
							placeholder="ページ内容を入力してください"
							editor={editor}
						/>
					</div>
				)}
			</div>
			{!isOnline && (
				<div className="fixed bottom-0 left-0 w-full bg-yellow-500 text-white text-center py-2">
					オフラインです。接続を確認してください。
				</div>
			)}
		</>
	);
}
