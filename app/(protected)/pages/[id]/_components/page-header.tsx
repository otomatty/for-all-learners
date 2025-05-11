"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Next.js 13 App Router
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, MoreVertical, Trash2, Layers } from "lucide-react"; // Layers アイコンをインポート
import { SpeechControlButtons } from "./speech-control-buttons";
import { DeletePageDialog } from "./delete-page-dialog";

interface PageHeaderProps {
	pageId: string; // ページID (slugから渡される想定)
	title: string;
	onTitleChange: (newTitle: string) => void;
	onGenerateContent: () => void;
	isGenerating: boolean;
	isDirty: boolean;
	isNewPage: boolean;
	onReadAloud: () => void;
	onPauseReadAloud: () => void;
	onResetReadAloud: () => void;
	onDeletePage: () => Promise<void>; // ページ削除処理のコールバック
	isPlaying: boolean; // SpeechControlButtons の isPlaying 状態
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
}: PageHeaderProps) {
	const router = useRouter();
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const handleNavigateToGenerateCards = () => {
		router.push(`/pages/${pageId}/generate-cards`);
	};

	return (
		<div className="flex items-center">
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
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onSelect={() => {
							// DropdownMenuが閉じる処理が完了するのを待ってからAlertDialogを開く
							setTimeout(() => setShowDeleteConfirm(true), 0);
						}}
						// destructive variant のスタイルをベースにしつつ、特定のhover/focusスタイルを適用したい場合はclassNameで指定
						className="hover:!bg-red-100 dark:hover:!bg-red-900/50 focus:!bg-red-100 dark:focus:!bg-red-900/50"
					>
						<Trash2 className="mr-2 h-4 w-4" />
						{/* アイコンとテキストの間にマージンを追加 */}
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
						setShowDeleteConfirm(false); // 成功したらダイアログを閉じる
					} catch (error) {
						// エラーは onDeletePage 内でトースト表示される想定
						// ダイアログは閉じない（ユーザーが再試行できるようにするか、エラーメッセージをダイアログ内に表示する）
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
