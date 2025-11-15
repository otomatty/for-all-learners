"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { autoSetThumbnailOnPageView } from "@/app/_actions/autoSetThumbnail";
import { duplicatePage } from "@/app/_actions/duplicatePage";
import { uploadAndSaveGyazoImage } from "@/app/_actions/gyazo";
import { deletePage } from "@/app/_actions/pages";
// Hooks
import { useDateShortcut } from "@/components/pages/_hooks/useDateShortcut";
import { usePageEditorLogic } from "@/components/pages/_hooks/usePageEditorLogic";
import { usePageFormState } from "@/components/pages/_hooks/usePageFormState";
import { useSpeechControls } from "@/components/pages/_hooks/useSpeechControls";
// Components
import BacklinksGrid from "@/components/pages/BacklinksGrid";
import { ContentSkeleton } from "@/components/pages/content-skeleton";
import { CreatePageConfirmDialog } from "@/components/pages/create-page-confirm-dialog";
import { DeleteEmptyTitlePageDialog } from "@/components/pages/delete-empty-title-page-dialog";
import { EditPageBubbleMenu } from "@/components/pages/edit-page-bubble-menu";
import { LinkGroupsSection } from "@/components/pages/link-groups-section";
import { PageHeader } from "@/components/pages/page-header";
import PageLinksGrid from "@/components/pages/page-links-grid";
import ResponsiveToolbar from "@/components/pages/responsive-toolbar";
import { TableBubbleMenu } from "@/components/pages/table-bubble-menu";
// Logger
import logger from "@/lib/logger";
// Supabase
import { createClient } from "@/lib/supabase/client";
import { useNavigateToPage } from "@/lib/unilink/resolver";
// Types
import type { Database } from "@/types/database.types";
import type { LinkGroupForUI } from "@/types/link-group";

interface EditPageFormProps {
	page: Database["public"]["Tables"]["pages"]["Row"];
	initialContent?: JSONContent;
	/** Cosense プロジェクト名 (manual sync 用) */
	cosenseProjectName?: string | null;
	missingLinks: string[];
	linkGroups: LinkGroupForUI[];
}

export default function EditPageForm({
	page,
	initialContent,
	cosenseProjectName,
	missingLinks,
	linkGroups,
}: EditPageFormProps) {
	// Link alert removed - now handled by link groups
	// const originalTitle = page.title;
	// const [showLinkAlert, setShowLinkAlert] = useState(false);
	// const [hasPromptedLink, setHasPromptedLink] = useState(false);

	// Detect if this is a newly created page via query param
	const searchParams = useSearchParams();
	const isNewPage = searchParams.get("newPage") === "true";
	const supabase = createClient();
	const router = useRouter();
	const pathname = usePathname();
	const navigateToPage = useNavigateToPage();

	// パス解析してnote slugを取得
	const noteSlug = pathname.startsWith("/notes/")
		? decodeURIComponent(pathname.split("/")[2])
		: undefined;

	const {
		title,
		setTitle,
		setIsLoading,
		isDirty,
		setIsDirty,
		isGenerating,
		setIsGenerating,
		isOnline,
	} = usePageFormState({ page, isNewPage });

	// Incoming pages check removed - now handled by link groups
	// useEffect(() => {
	// 	if (
	// 		!hasPromptedLink &&
	// 		title !== originalTitle &&
	// 		incomingPages.length > 0
	// 	) {
	// 		setShowLinkAlert(true);
	// 		setHasPromptedLink(true);
	// 	}
	// }, [originalTitle, hasPromptedLink, title]);

	// 自動サムネイル設定（ページ表示時）
	useEffect(() => {
		const autoSetThumbnail = async () => {
			// サムネイルが既に設定されている場合はスキップ
			if (page.thumbnail_url) {
				return;
			}

			// initialContentがある場合のみ実行
			if (!initialContent) {
				return;
			}

			try {
				const result = await autoSetThumbnailOnPageView(
					page.id,
					initialContent,
					page.thumbnail_url,
				);

				if (result.thumbnailSet && result.thumbnailUrl) {
					// 必要に応じてページを再読み込みまたは状態を更新
				} else if (result.error) {
				}
			} catch (error) {
				logger.error(
					{ error, pageId: page.id },
					"サムネイル自動設定でエラーが発生",
				);
			}
		};
		autoSetThumbnail();
	}, [page.id, page.thumbnail_url, initialContent]);

	const [isDeleting, setIsDeleting] = useState(false);

	// State for create page confirmation dialog
	const [createPageDialogOpen, setCreatePageDialogOpen] = useState(false);
	const [pendingPageTitle, setPendingPageTitle] = useState("");
	const [pendingConfirmCallback, setPendingConfirmCallback] = useState<
		(() => Promise<void>) | null
	>(null);

	// State for delete empty title page confirmation dialog
	const [deleteEmptyTitleDialogOpen, setDeleteEmptyTitleDialogOpen] =
		useState(false);

	// Callback for showing create page dialog
	const handleShowCreatePageDialog = useCallback(
		(title: string, onConfirm: () => Promise<void>) => {
			setPendingPageTitle(title);
			setPendingConfirmCallback(() => onConfirm);
			setCreatePageDialogOpen(true);
		},
		[],
	);

	// Handler for deleting page with empty title
	const handleDeleteEmptyTitlePage = useCallback(async () => {
		setIsDeleting(true);
		setIsLoading(true);
		toast.loading("ページを削除しています...");
		try {
			await deletePage(page.id);
			toast.dismiss();
			toast.success("タイトルが空のため、ページを削除しました");
			// Redirect to appropriate page
			if (noteSlug) {
				router.push(`/notes/${encodeURIComponent(noteSlug)}`);
			} else {
				router.push("/notes/default");
			}
		} catch (error) {
			logger.error({ error, pageId: page.id }, "空タイトルページ削除エラー");
			toast.dismiss();
			toast.error("ページの削除に失敗しました");
		} finally {
			setIsDeleting(false);
			setIsLoading(false);
		}
	}, [page.id, noteSlug, router, setIsLoading]);

	const {
		editor,
		handleGenerateContent,
		wrapSelectionWithPageLink,
		splitPage,
	} = usePageEditorLogic({
		page,
		initialContent,
		title,
		supabase,
		setIsLoading,
		setIsGenerating,
		isDirty,
		setIsDirty,
		noteSlug,
		onShowCreatePageDialog: handleShowCreatePageDialog,
		onDeleteEmptyTitlePage: () => {
			setDeleteEmptyTitleDialogOpen(true);
			return Promise.resolve();
		},
		onNavigate: (href: string) => {
			// Phase 2: Use router.push for client-side navigation
			router.push(href);
		},
	});

	const { handleReadAloud, handlePause, handleReset, isPlaying } =
		useSpeechControls({
			editor,
		});
	const handleDateShortcut = useDateShortcut(editor);

	// Handler for confirming page creation
	const handleConfirmCreatePage = useCallback(async () => {
		if (pendingConfirmCallback) {
			await pendingConfirmCallback();
			setPendingConfirmCallback(null);
		}
		setCreatePageDialogOpen(false);
	}, [pendingConfirmCallback]);

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
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "t") {
				e.preventDefault();
				editor
					.chain()
					.focus()
					.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
					.run();
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
			router.push("/notes/default"); // デフォルトノートのページ一覧にリダイレクト
		} catch (error) {
			logger.error({ error, pageId: page.id, title }, "ページ削除エラー");
			toast.dismiss(); // ローディング中のトーストを消す
			toast.error("ページの削除に失敗しました");
			throw new Error("ページ削除エラー", { cause: error }); // DeletePageDialog でエラーを捕捉できるように再スロー
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
			} catch {
				toast.error("画像アップロードに失敗しました");
			} finally {
				setIsLoading(false);
			}
		},
		[editor, setIsLoading],
	);

	// Handler for generating cards
	const handleNavigateToGenerateCards = useCallback(() => {
		const slug = noteSlug || "default";
		router.push(`/notes/${slug}/${page.id}/generate-cards`);
	}, [router, page.id, noteSlug]);

	// Handler for duplicating page
	const handleDuplicatePage = useCallback(async () => {
		setIsLoading(true);
		toast.loading("ページを複製しています...");
		try {
			// note内のページかどうかを判定
			const isInNote = noteSlug !== undefined;

			const newPage = await duplicatePage({
				originalPageId: page.id,
				newTitle: `${title} copy`,
				linkToSameNote: isInNote,
			});

			toast.dismiss();
			toast.success(`ページ「${title}」を複製しました`);

			// 複製されたページに移動
			if (isInNote) {
				router.push(`/notes/${encodeURIComponent(noteSlug)}/${newPage.id}`);
			} else {
				router.push(`/notes/default/${newPage.id}`);
			}
		} catch {
			toast.dismiss();
			toast.error("ページの複製に失敗しました");
		} finally {
			setIsLoading(false);
		}
	}, [page.id, title, noteSlug, router, setIsLoading]);

	return (
		<>
			{/* Link alert removed - now handled by link groups */}
			<div className="flex gap-2">
				<div className="flex-1 space-y-6">
					{editor && (
						<div className="relative">
							<div className="bg-background rounded-lg py-12 px-2 md:px-4 border border-border">
								<PageHeader
									cosenseProjectName={cosenseProjectName}
									title={title}
									onTitleChange={setTitle}
									onEnterPress={() => {
										if (!editor) return;
										editor
											.chain()
											.focus()
											.insertContentAt(0, [
												{
													type: "paragraph",
													content: [{ type: "text", text: "" }],
												},
											])
											.setTextSelection(1)
											.run();
									}}
									scrapboxPageContentSyncedAt={
										page.scrapbox_page_content_synced_at
									}
									scrapboxPageListSyncedAt={page.scrapbox_page_list_synced_at}
								/>
								<EditPageBubbleMenu
									editor={editor}
									wrapSelectionWithPageLink={wrapSelectionWithPageLink}
									splitPage={splitPage}
								/>
								<TableBubbleMenu editor={editor} />
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
							{/* 参照元ページ（バックリンク） */}
							<BacklinksGrid pageId={page.id} />
							{/* リンクグループセクション（新規） */}
							<LinkGroupsSection linkGroups={linkGroups} noteSlug={noteSlug} />
							{/* 未設定リンク一覧 */}
							<PageLinksGrid missingLinks={missingLinks} noteSlug={noteSlug} />
						</div>
					)}
				</div>
				{/* レスポンシブツールバー */}
				<ResponsiveToolbar
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
					onDuplicatePage={handleDuplicatePage}
					currentPath={pathname}
					noteSlug={noteSlug}
					onCreateNewPage={() => {}} // ダミー実装（ResponsiveToolbar内で処理）
					onShowDeleteConfirm={() => {}} // ダミー実装（ResponsiveToolbar内で処理）
					onOpenImageUpload={() => {}} // ダミー実装（ResponsiveToolbar内で処理）
				/>
			</div>
			{!isOnline && (
				<div className="fixed bottom-0 left-0 w-full bg-yellow-500 text-white text-center py-2">
					オフラインです。接続を確認してください。
				</div>
			)}
			<CreatePageConfirmDialog
				isOpen={createPageDialogOpen}
				onOpenChange={setCreatePageDialogOpen}
				pageTitle={pendingPageTitle}
				onConfirmCreate={handleConfirmCreatePage}
			/>
			<DeleteEmptyTitlePageDialog
				isOpen={deleteEmptyTitleDialogOpen}
				onOpenChange={setDeleteEmptyTitleDialogOpen}
				onConfirmDelete={handleDeleteEmptyTitlePage}
			/>
		</>
	);
}
