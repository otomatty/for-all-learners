"use client";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	CreditCard,
	ImagePlus,
	MoreVertical,
	Pause,
	Plus,
	RotateCw,
	Sparkles,
	Trash2,
	Volume2,
} from "lucide-react";
import React, { useState, useRef } from "react";
import { DeletePageDialog } from "./delete-page-dialog";
import ToolbarButton from "./toolbar-button";

interface FloatingToolbarProps {
	title: string;
	onGenerateContent: () => void;
	isGenerating: boolean;
	isDirty: boolean;
	isNewPage: boolean;
	onReadAloud: () => void;
	onPauseReadAloud: () => void;
	onResetReadAloud: () => void;
	isPlaying: boolean;
	onGenerateCards: () => void;
	onUploadImage: (file: File) => void;
	onDeletePage: () => Promise<void>;
	/** 現在のパス情報を渡す（note内かどうかの判定用） */
	currentPath?: string;
	/** note slug（note内ページの場合） */
	noteSlug?: string;
}

export default function FloatingToolbar({
	title,
	onGenerateContent,
	isGenerating,
	isDirty,
	isNewPage,
	onReadAloud,
	onPauseReadAloud,
	onResetReadAloud,
	isPlaying,
	onGenerateCards,
	onUploadImage,
	onDeletePage,
	currentPath,
	noteSlug,
}: FloatingToolbarProps) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// 新規ページ作成ハンドラ
	const handleCreateNewPage = () => {
		if (noteSlug) {
			// Note内のページの場合、そのnoteに属する新規ページを作成
			window.location.href = `/notes/${encodeURIComponent(noteSlug)}/new`;
		} else {
			// 一般ページの場合、独立したページを作成
			window.location.href = "/pages/new";
		}
	};

	return (
		<>
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
			<div className="sticky top-16 right-4 flex flex-col gap-4 z-50 p-4 bg-background rounded-lg border border-border">
				{/* 新規ページ作成ボタン */}
				<button
					type="button"
					className="w-6 h-6 text-blue-500 hover:text-blue-600 cursor-pointer bg-transparent border-none p-0"
					onClick={handleCreateNewPage}
					title={
						noteSlug ? `${noteSlug}に新規ページを追加` : "新規ページを作成"
					}
				>
					<Plus className="w-full h-full" />
				</button>
				<Popover>
					<PopoverTrigger asChild>
						<Sparkles
							className={`w-6 h-6 text-yellow-500 hover:text-yellow-600 cursor-pointer ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
						/>
					</PopoverTrigger>
					<PopoverContent side="left" className="flex flex-col p-2">
						<ToolbarButton
							icon={<Sparkles />}
							text="コンテンツ生成"
							onClick={onGenerateContent}
						/>
					</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger asChild>
						{isPlaying ? (
							<Pause className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
						) : (
							<Volume2 className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
						)}
					</PopoverTrigger>
					<PopoverContent side="left" className="flex flex-col p-2 gap-1">
						<ToolbarButton
							icon={<Volume2 />}
							text="再生"
							onClick={onReadAloud}
						/>
						<ToolbarButton
							icon={<Pause />}
							text="一時停止"
							onClick={onPauseReadAloud}
						/>
						<ToolbarButton
							icon={<RotateCw />}
							text="リセット"
							onClick={onResetReadAloud}
						/>
					</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger asChild>
						<MoreVertical className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
					</PopoverTrigger>
					<PopoverContent side="left" className="flex flex-col p-2 gap-1">
						<ToolbarButton
							icon={<CreditCard />}
							text="カードを生成"
							onClick={onGenerateCards}
						/>
						<ToolbarButton
							icon={<ImagePlus />}
							text="画像をアップロード"
							onClick={() => fileInputRef.current?.click()}
						/>
						<ToolbarButton
							icon={<Trash2 />}
							text="ページを削除"
							onClick={() => setShowDeleteConfirm(true)}
							className="text-red-600"
						/>
					</PopoverContent>
				</Popover>
			</div>
			<DeletePageDialog
				isOpen={showDeleteConfirm}
				onOpenChange={setShowDeleteConfirm}
				pageTitle={title}
				onConfirmDelete={async () => {
					await onDeletePage();
					setShowDeleteConfirm(false);
				}}
			/>
		</>
	);
}
