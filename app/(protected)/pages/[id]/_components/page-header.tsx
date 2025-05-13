"use client";

import { Button } from "@/components/ui/button";
import { CosenseSyncBadge } from "@/components/ui/cosense-sync-badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Layers,
	MoreVertical,
	Sparkles,
	Trash2,
	Image as ImageIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { DeletePageDialog } from "./delete-page-dialog";
import { SpeechControlButtons } from "./speech-control-buttons";
import { toast } from "sonner";

interface PageHeaderProps {
	pageId: string;
	title: string;
	onTitleChange: (newTitle: string) => void;
	onGenerateContent: () => void;
	isGenerating: boolean;
	isDirty: boolean;
	isNewPage: boolean;
	onReadAloud: () => void;
	onPauseReadAloud: () => void;
	onResetReadAloud: () => void;
	onDeletePage: () => Promise<void>;
	isPlaying: boolean;
	scrapboxPageContentSyncedAt?: string | null;
	scrapboxPageListSyncedAt?: string | null;
	cosenseProjectName?: string | null;
	onUploadImage: (file: File) => void;
}

export function PageHeader({
	pageId,
	title,
	onTitleChange,
	onGenerateContent,
	isGenerating,
	isDirty,
	isNewPage,
	onReadAloud,
	onPauseReadAloud,
	onResetReadAloud,
	onDeletePage,
	isPlaying,
	scrapboxPageContentSyncedAt,
	scrapboxPageListSyncedAt,
	cosenseProjectName,
	onUploadImage,
}: PageHeaderProps) {
	const router = useRouter();
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isSyncingContent, setIsSyncingContent] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleNavigateToGenerateCards = () => {
		router.push(`/pages/${pageId}/generate-cards`);
	};

	return (
		<div className="flex items-center">
			{/* Hidden file input for image upload */}
			<input
				type="file"
				ref={fileInputRef}
				hidden
				accept="image/png,image/jpeg,image/webp,image/gif"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) onUploadImage(file);
					e.target.value = "";
				}}
			/>
			<Input
				value={title}
				onChange={(e) => onTitleChange(e.target.value)}
				placeholder="ページタイトルを入力"
				variant="borderless"
				className="text-4xl font-bold flex-1"
			/>
			<button
				type="button"
				onClick={onGenerateContent}
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

			{cosenseProjectName && scrapboxPageListSyncedAt && (
				<button
					type="button"
					onClick={async () => {
						setIsSyncingContent(true);
						try {
							const res = await fetch(
								`/api/cosense/sync/page/${encodeURIComponent(
									cosenseProjectName,
								)}/${encodeURIComponent(title)}`,
								{ cache: "no-store" },
							);
							if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
							toast.success("コンテンツ同期完了");
							router.refresh();
						} catch (err) {
							console.error("Cosense content sync error:", err);
							toast.error("コンテンツ同期に失敗しました");
						} finally {
							setIsSyncingContent(false);
						}
					}}
					title="Cosenseからコンテンツを同期"
					className="ml-2"
				>
					<CosenseSyncBadge
						isLoading={isSyncingContent}
						status={scrapboxPageContentSyncedAt ? "synced" : "unsynced"}
						className="cursor-pointer"
					/>
				</button>
			)}

			<SpeechControlButtons
				onReadAloud={onReadAloud}
				onPauseReadAloud={onPauseReadAloud}
				onResetReadAloud={onResetReadAloud}
				isPlaying={isPlaying}
			/>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="ml-2">
						<MoreVertical className="h-5 w-5" />
						<span className="sr-only">その他の操作</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onSelect={handleNavigateToGenerateCards}
						className="cursor-pointer"
					>
						<Layers className="mr-2 h-4 w-4" />
						<span>カードを生成する</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => fileInputRef.current?.click()}
						className="cursor-pointer"
					>
						<ImageIcon className="mr-2 h-4 w-4" />
						<span>画像をアップロード</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onSelect={() => {
							setTimeout(() => setShowDeleteConfirm(true), 0);
						}}
						className="hover:!bg-red-100 dark:hover:!bg-red-900/50 focus:!bg-red-100 dark:focus:!bg-red-900/50"
					>
						<Trash2 className="mr-2 h-4 w-4" />
						<span>ページを削除</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<DeletePageDialog
				isOpen={showDeleteConfirm}
				onOpenChange={setShowDeleteConfirm}
				pageTitle={title}
				onConfirmDelete={async () => {
					try {
						await onDeletePage();
						setShowDeleteConfirm(false);
					} catch (error) {
						console.error(
							"ページ削除中にエラー（ダイアログ呼び出し側）:",
							error,
						);
					}
				}}
			/>
		</div>
	);
}
