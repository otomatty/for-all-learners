"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Sparkles, Volume2, Pause, RotateCcw } from "lucide-react";
import { generatePageInfo } from "@/app/_actions/generatePageInfo";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "./content-skeleton";

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
	const wrapSelectionWithPageLink = async () => {
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
	};

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
					<div className="ml-2">
						{isGenerating ? (
							<ContentSkeleton />
						) : (
							<button
								type="button"
								onClick={handleGenerate}
								disabled={!isDirty && !isNewPage}
								title="タイトルからコンテンツ生成"
								className="p-1 rounded hover:bg-gray-100 transition-all duration-300 ease-out"
							>
								<Sparkles className="w-10 h-10 text-yellow-500" />
							</button>
						)}
					</div>
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
