import type { LucideIcon } from "lucide-react";
import {
	Copy,
	CreditCard,
	ImagePlus,
	Pause,
	Plus,
	RotateCw,
	Sparkles,
	Trash2,
	Volume2,
} from "lucide-react";

export interface ToolbarAction {
	id: string;
	icon: LucideIcon;
	label: string;
	onClick: () => void;
	className?: string;
	disabled?: boolean;
}

export interface ToolbarMenuItemsProps {
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
	onDuplicatePage: () => void;
	currentPath?: string;
	noteSlug?: string;
	onCreateNewPage: () => void;
	onShowDeleteConfirm: () => void;
	onOpenImageUpload: () => void;
}

export function createToolbarMenuItems(props: ToolbarMenuItemsProps): {
	primaryActions: ToolbarAction[];
	audioActions: ToolbarAction[];
	moreActions: ToolbarAction[];
} {
	return {
		primaryActions: [
			{
				id: "new-page",
				icon: Plus,
				label: props.noteSlug
					? `${props.noteSlug}に新規ページを追加`
					: "新規ページを作成",
				onClick: props.onCreateNewPage,
				className: "text-blue-500 hover:text-blue-600",
			},
			{
				id: "generate-content",
				icon: Sparkles,
				label: "コンテンツ生成",
				onClick: props.onGenerateContent,
				className: "text-yellow-500 hover:text-yellow-600",
				disabled: props.isGenerating,
			},
		],
		audioActions: [
			{
				id: "read-aloud",
				icon: Volume2,
				label: "再生",
				onClick: props.onReadAloud,
			},
			{
				id: "pause-read-aloud",
				icon: Pause,
				label: "一時停止",
				onClick: props.onPauseReadAloud,
			},
			{
				id: "reset-read-aloud",
				icon: RotateCw,
				label: "リセット",
				onClick: props.onResetReadAloud,
			},
		],
		moreActions: [
			{
				id: "generate-cards",
				icon: CreditCard,
				label: "カードを生成",
				onClick: props.onGenerateCards,
			},
			{
				id: "upload-image",
				icon: ImagePlus,
				label: "画像をアップロード",
				onClick: props.onOpenImageUpload,
			},
			{
				id: "duplicate-page",
				icon: Copy,
				label: "ページを複製",
				onClick: props.onDuplicatePage,
			},
			{
				id: "delete-page",
				icon: Trash2,
				label: "ページを削除",
				onClick: props.onShowDeleteConfirm,
				className: "text-red-600",
			},
		],
	};
}
