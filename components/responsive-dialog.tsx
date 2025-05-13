"use client";

import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * ResponsiveDialogコンポーネントのProps定義
 *
 * @property {React.ReactNode} children - モーダルまたはドロワー内にレンダリングするコンテンツ
 * @property {string} [triggerText='Edit'] - トリガーボタンに表示するテキスト
 * @property {string} [triggerIcon] - トリガーボタンに表示するアイコン
 * @property {string} [dialogTitle='Dialog'] - ダイアログ/ドロワー上部に表示するタイトル
 * @property {string} [dialogDescription=''] - タイトル下に表示する説明文
 * @property {React.ComponentProps<typeof Button>} [triggerButtonProps] - トリガーボタンに渡す追加のButtonプロパティ
 * @property {boolean} open - ダイアログ/ドロワーが開いているかどうか
 * @property {(open: boolean) => void} onOpenChange - ダイアログ/ドロワーの開閉状態が変更されたときに呼び出されるコールバック
 */
interface ResponsiveDialogProps {
	children: React.ReactNode;
	/** トリガーボタンに表示するテキスト */
	triggerText?: string;
	/** トリガーボタンに表示するアイコン */
	triggerIcon?: React.ReactNode;
	dialogTitle?: string;
	dialogDescription?: string;
	triggerButtonProps?: React.ComponentProps<typeof Button>;
	className?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * レスポンシブ対応のモーダル/ドロワーコンポーネント
 *
 * モバイル画面ではDrawerを、それ以外ではDialogを自動で切り替えて表示します
 *
 * @example
 * ```tsx
 * <ResponsiveDialog
 *   triggerText="設定を開く"
 *   triggerButtonProps={{ variant: 'secondary', size: 'sm' }}
 *   dialogTitle="設定"
 *   dialogDescription="アプリの設定を調整します"
 * >
 *   <SettingsForm />
 * </ResponsiveDialog>
 * ```
 *
 * @param {ResponsiveDialogProps} props - ResponsiveDialogの設定用Props
 * @returns {JSX.Element} レスポンシブモーダル/ドロワーのJSX要素
 */
export function ResponsiveDialog({
	children,
	triggerText = "Edit",
	triggerIcon,
	dialogTitle = "Dialog",
	dialogDescription = "",
	className,
	triggerButtonProps,
	open,
	onOpenChange,
}: ResponsiveDialogProps) {
	const isMobile = useIsMobile();

	const buttonProps: React.ComponentProps<typeof Button> = {
		variant: "outline",
		onClick: () => triggerButtonProps,
	};

	// アイコンが指定されていれば優先的に表示
	const triggerElement = triggerIcon ? (
		<Button {...buttonProps}>{triggerIcon}</Button>
	) : (
		<Button {...buttonProps}>{triggerText}</Button>
	);

	if (isMobile) {
		return (
			<Drawer
				open={open}
				onOpenChange={(currentOpenState) => {
					onOpenChange(currentOpenState);
				}}
			>
				{/* DropdownMenuから開く場合はTriggerは不要になることが多い */}
				{/* <DrawerTrigger asChild>{triggerElement}</DrawerTrigger> */}
				<DrawerContent className="sm:max-w-[425px]">
					<DrawerHeader>
						<DrawerTitle>{dialogTitle}</DrawerTitle>
						<DrawerDescription>{dialogDescription}</DrawerDescription>
					</DrawerHeader>
					{children}
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(currentOpenState) => {
				onOpenChange(currentOpenState);
			}}
		>
			{/* DropdownMenuから開く場合はTriggerは不要になることが多い */}
			{/* <DialogTrigger asChild>{triggerElement}</DialogTrigger> */}
			<DialogContent className={className}>
				<DialogHeader className="text-left">
					<DialogTitle>{dialogTitle}</DialogTitle>
					<DialogDescription>{dialogDescription}</DialogDescription>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}
