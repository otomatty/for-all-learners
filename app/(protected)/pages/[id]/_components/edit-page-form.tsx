"use client";

// Supabase
import { createClient } from "@/lib/supabase/client";
// Types
import type { Database } from "@/types/database.types";
import type { JSONContent } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";
import { toast } from "sonner";
import { useDateShortcut } from "../_hooks/useDateShortcut";
import { usePageEditorLogic } from "../_hooks/usePageEditorLogic";
// Hooks
import { usePageFormState } from "../_hooks/usePageFormState";
import { useSpeechControls } from "../_hooks/useSpeechControls";
// Components
import { ContentSkeleton } from "./content-skeleton";
import { EditPageBubbleMenu } from "./edit-page-bubble-menu";
import { PageHeader } from "./page-header";
import { uploadAndSaveGyazoImage } from "@/app/_actions/gyazo";
import PageLinksGrid from "./page-links-grid";
import RelatedCardsGrid from "./related-cards-grid";
import FloatingToolbar from "./floating-toolbar";

interface EditPageFormProps {
	page: Database["public"]["Tables"]["pages"]["Row"];
	initialContent?: JSONContent;
	/** Cosense プロジェクト名 (manual sync 用) */
	cosenseProjectName?: string | null;
	outgoingPages: Array<{
		id: string;
		title: string;
		thumbnail_url: string | null;
		content_tiptap: JSONContent;
	}>;
	nestedLinks: Record<string, string[]>;
	missingLinks: string[];
}

export default function EditPageForm({
	page,
	initialContent,
	cosenseProjectName,
	outgoingPages,
	nestedLinks,
	missingLinks,
}: EditPageFormProps) {
	// Detect if this is a newly created page via query param
	const searchParams = useSearchParams();
	const isNewPage = searchParams.get("newPage") === "true";
	const supabase = createClient();
	const router = useRouter();

	const {
		title,
		setTitle,
		setIsLoading,
		isDirty,
		isGenerating,
		setIsGenerating,
		isOnline,
	} = usePageFormState({ page, isNewPage });

	const { editor, handleGenerateContent, wrapSelectionWithPageLink } =
		usePageEditorLogic({
			page,
			initialContent,
			title,
			supabase,
			setIsLoading,
			setIsGenerating,
			isDirty,
		});

	const { handleReadAloud, handlePause, handleReset, isPlaying } =
		useSpeechControls({
			editor,
		});
	const handleDateShortcut = useDateShortcut(editor);
	const [isDeleting, setIsDeleting] = useState(false);

	// Keyboard shortcuts: Mod-k for page link, Mod-Shift-l/o for bullet/ordered list
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!editor) return;
			const key = e.key.toLowerCase();
			if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === "t") {
				e.preventDefault();
				handleDateShortcut();
			}
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
		[editor, wrapSelectionWithPageLink, handleDateShortcut],
	);

	const handleDeletePage = useCallback(async () => {
		setIsDeleting(true);
		setIsLoading(true); // 共通のローディングインジケータを使う場合
		toast.loading("ページを削除しています...");
		try {
			const { error } = await supabase.from("pages").delete().eq("id", page.id);
			if (error) throw error;
			toast.dismiss(); // ローディング中のトーストを消す
			toast.success(`ページ「${title}」を削除しました`);
			router.push("/pages"); // ページ一覧などにリダイレクト
		} catch (err) {
			console.error("ページ削除エラー:", err);
			toast.dismiss(); // ローディング中のトーストを消す
			toast.error("ページの削除に失敗しました");
			throw err; // DeletePageDialog でエラーを捕捉できるように再スロー
		} finally {
			setIsDeleting(false);
			setIsLoading(false);
		}
	}, [supabase, page.id, router, title, setIsLoading]);

	// 画像アップロード用ハンドラ
	const handleUploadImage = useCallback(
		async (file: File) => {
			setIsLoading(true);
			try {
				// Gyazo API returns direct image URL
				const { url } = await uploadAndSaveGyazoImage(file);
				if (editor) {
					editor
						.chain()
						.focus()
						.insertContent({ type: "gyazoImage", attrs: { src: url } })
						.run();
				}
			} catch (err) {
				console.error("画像アップロードエラー:", err);
				toast.error("画像アップロードに失敗しました");
			} finally {
				setIsLoading(false);
			}
		},
		[editor, setIsLoading],
	);

	// Handler for generating cards
	const handleNavigateToGenerateCards = useCallback(() => {
		router.push(`/pages/${page.id}/generate-cards`);
	}, [router, page.id]);

	return (
		<>
			<div className="flex gap-2">
				<div className="flex-1 space-y-6">
					{editor && (
						<div className="relative">
							<div className="bg-background rounded-lg py-12 px-2 md:px-4 border border-border">
								<PageHeader
									cosenseProjectName={cosenseProjectName}
									title={title}
									onTitleChange={setTitle}
									scrapboxPageContentSyncedAt={
										page.scrapbox_page_content_synced_at
									}
									scrapboxPageListSyncedAt={page.scrapbox_page_list_synced_at}
								/>
								<EditPageBubbleMenu
									editor={editor}
									wrapSelectionWithPageLink={wrapSelectionWithPageLink}
								/>
								{isGenerating || isDeleting ? ( // 削除中もスケルトン表示
									<ContentSkeleton />
								) : (
									<EditorContent
										key={JSON.stringify(initialContent)}
										placeholder="ページ内容を入力してください"
										editor={editor}
										onKeyDown={handleKeyDown}
									/>
								)}
							</div>
							{/* リンク一覧 */}
							<PageLinksGrid
								outgoingPages={outgoingPages}
								nestedLinks={nestedLinks}
								missingLinks={missingLinks}
							/>
							{/* 関連カード */}
							<RelatedCardsGrid pageId={page.id} />
						</div>
					)}
				</div>
				{/* フローティングアクションメニュー */}
				<div className="hidden md:block sticky top-0">
					<FloatingToolbar
						title={title}
						onGenerateContent={handleGenerateContent}
						isGenerating={isGenerating}
						isDirty={isDirty}
						isNewPage={isNewPage}
						onReadAloud={handleReadAloud}
						onPauseReadAloud={handlePause}
						onResetReadAloud={handleReset}
						isPlaying={isPlaying}
						onGenerateCards={handleNavigateToGenerateCards}
						onUploadImage={handleUploadImage}
						onDeletePage={handleDeletePage}
					/>
				</div>
			</div>
			{!isOnline && (
				<div className="fixed bottom-0 left-0 w-full bg-yellow-500 text-white text-center py-2">
					オフラインです。接続を確認してください。
				</div>
			)}
		</>
	);
}
