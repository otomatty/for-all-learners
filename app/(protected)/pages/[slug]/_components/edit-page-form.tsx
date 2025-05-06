"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import { CustomHeading } from "@/lib/tiptap-extensions/custom-heading";
import type { JSONContent } from "@tiptap/core";
import type { Database } from "@/types/database.types";
import Placeholder from "@tiptap/extension-placeholder";
import { Sparkles, Volume2, Pause, RotateCcw } from "lucide-react";
import { generatePageInfo } from "@/app/_actions/generatePageInfo";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "./content-skeleton";
import { EditPageBubbleMenu } from "./edit-page-bubble-menu";
import type { KeyboardEvent } from "react";

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
	// Detect if this is a newly created page via query param
	const searchParams = useSearchParams();
	const isNewPage = searchParams.get("newPage") === "true";
	const router = useRouter();
	const supabase = createClient();
	// Determine content for editor: use injected initialContent or original
	const initialDoc: JSONContent = initialContent ??
		(page.content_tiptap as JSONContent) ?? { type: "doc", content: [] };
	const [title, setTitle] = useState(page.title);
	const [isLoading, setIsLoading] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

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

	// Initialize TipTap editor before defining savePage and autosave hooks
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
		} catch (err) {
			console.error("EditPageForm save error:", err);
			toast.error("保存に失敗しました");
		} finally {
			setIsLoading(false);
		}
	}, [editor, title, page.id, supabase]);

	// タイトルからGemini生成を呼び出すハンドラー
	const handleGenerate = useCallback(async () => {
		if (!title.trim()) {
			toast.error("タイトルを入力してください");
			return;
		}
		setIsGenerating(true);
		try {
			const markdown = await generatePageInfo(title);
			const html = marked.parse(markdown);
			editor?.commands.setContent(html);
			await savePage();
			toast.success("コンテンツ生成完了");
		} catch (error) {
			console.error("generatePageInfo error:", error);
			toast.error("生成に失敗しました");
		} finally {
			setIsGenerating(false);
		}
	}, [title, editor, savePage]);

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
	}, [savePage, editor]);
	// Autosave on title changes
	useEffect(() => {
		if (!editor) return;
		if (saveTimeout.current) clearTimeout(saveTimeout.current);
		saveTimeout.current = setTimeout(savePage, 2000);
		return () => {
			if (saveTimeout.current) clearTimeout(saveTimeout.current);
		};
	}, [savePage, editor]);

	// Function to wrap selection with pageLink mark
	const wrapSelectionWithPageLink = useCallback(async () => {
		if (!editor) return;
		const { from, to } = editor.state.selection;
		const text = editor.state.doc.textBetween(from, to, "");
		if (!text) {
			toast.error("テキストを選択してページリンクを作成してください");
			return;
		}
		try {
			// Check if a page with the same title exists
			const { data: pages, error } = await supabase
				.from("pages")
				.select("id")
				.eq("title", text)
				.limit(1);
			if (error) {
				console.error("ページチェックエラー:", error);
				toast.error("リンク作成中にエラーが発生しました");
				return;
			}
			const pageId = pages?.[0]?.id ?? null;
			// 選択したテキストに pageLink マークを付与する（pageId があればリンク先設定）
			editor
				.chain()
				.focus()
				.toggleMark("pageLink", { pageName: text, pageId })
				.run();
		} catch (err) {
			console.error("リンク作成例外:", err);
			toast.error("リンク作成中にエラーが発生しました");
		}
	}, [editor, supabase]);

	// Keyboard shortcuts: Mod-k for page link, Mod-Shift-l/o for bullet/ordered list
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!editor) return;
			const key = e.key.toLowerCase();
			if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === "k") {
				e.preventDefault();
				wrapSelectionWithPageLink();
			}
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "l") {
				e.preventDefault();
				editor.chain().focus().toggleBulletList().run();
			}
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "o") {
				e.preventDefault();
				editor.chain().focus().toggleOrderedList().run();
			}
		},
		[editor, wrapSelectionWithPageLink],
	);

	/**
	 * ページの内容を読み上げる
	 */
	const handleReadAloud = useCallback(() => {
		if (!editor) return;
		const text = editor.getText();
		if (!text) {
			toast.error("読み上げるテキストがありません");
			return;
		}
		try {
			speechSynthesis.cancel();
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = "ja-JP";
			speechSynthesis.speak(utterance);
		} catch (err) {
			console.error("handleReadAloud error:", err);
			toast.error("読み上げ機能を利用できません");
		}
	}, [editor]);

	/**
	 * 読み上げを一時停止する
	 */
	const handlePause = useCallback(() => {
		try {
			if (speechSynthesis.speaking && !speechSynthesis.paused) {
				speechSynthesis.pause();
				toast.success("読み上げを一時停止しました");
			} else {
				toast.error("一時停止できる読み上げがありません");
			}
		} catch (err) {
			console.error("handlePause error:", err);
			toast.error("一時停止に失敗しました");
		}
	}, []);

	/**
	 * 読み上げをリセット（停止）する
	 */
	const handleReset = useCallback(() => {
		try {
			if (speechSynthesis.speaking || speechSynthesis.paused) {
				speechSynthesis.cancel();
				toast.success("読み上げを停止しました");
			} else {
				toast.error("停止できる読み上げがありません");
			}
		} catch (err) {
			console.error("handleReset error:", err);
			toast.error("停止に失敗しました");
		}
	}, []);

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
						disabled={isGenerating || (!isDirty && !isNewPage)}
						title="タイトルからコンテンツ生成"
						className={`ml-2 p-1 rounded hover:bg-gray-100 transition-all duration-300 ease-out ${
							isDirty || isNewPage
								? "opacity-100 translate-x-0 visible"
								: "opacity-0 -translate-x-4 invisible"
						}`}
					>
						<Sparkles
							className={`w-10 h-10 text-yellow-500 ${isGenerating ? "animate-spin" : ""}`}
						/>
					</button>
					{/* 読み上げボタン */}
					<Button
						type="button"
						onClick={handleReadAloud}
						title="ページを読み上げる"
						variant="outline"
						className="ml-2"
					>
						<Volume2 className="w-6 h-6" />
					</Button>
					{/* 一時停止ボタン */}
					<Button
						type="button"
						onClick={handlePause}
						title="一時停止"
						variant="outline"
						className="ml-2"
					>
						<Pause className="w-6 h-6" />
					</Button>
					{/* リセットボタン */}
					<Button
						type="button"
						onClick={handleReset}
						title="リセット"
						variant="outline"
						className="ml-2"
					>
						<RotateCcw className="w-6 h-6" />
					</Button>
				</div>
				{editor && (
					<div className="relative">
						<EditPageBubbleMenu
							editor={editor}
							wrapSelectionWithPageLink={wrapSelectionWithPageLink}
						/>
						{isGenerating ? (
							<ContentSkeleton />
						) : (
							<EditorContent
								placeholder="ページ内容を入力してください"
								editor={editor}
								onKeyDown={handleKeyDown}
							/>
						)}
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
