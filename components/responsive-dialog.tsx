"use client";

import * as React from "react";

import { useIsMobile } from "@/hooks/use-mobile";
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

/**
 * ResponsiveDialogコンポーネントのProps定義
 *
 * @property {React.ReactNode} children - モーダルまたはドロワー内にレンダリングするコンテンツ
 * @property {string} [triggerText='Edit'] - トリガーボタンに表示するテキスト
 * @property {string} [dialogTitle='Dialog'] - ダイアログ/ドロワー上部に表示するタイトル
 * @property {string} [dialogDescription=''] - タイトル下に表示する説明文
 * @property {React.ComponentProps<typeof Button>} [triggerButtonProps] - トリガーボタンに渡す追加のButtonプロパティ
 */
interface ResponsiveDialogProps {
	children: React.ReactNode;
	triggerText?: string;
	dialogTitle?: string;
	dialogDescription?: string;
	triggerButtonProps?: React.ComponentProps<typeof Button>;
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
	dialogTitle = "Dialog",
	dialogDescription = "",
	triggerButtonProps,
}: ResponsiveDialogProps) {
	const [open, setOpen] = React.useState(false);
	const isMobile = useIsMobile();

	const buttonProps: React.ComponentProps<typeof Button> = {
		variant: "outline",
		...triggerButtonProps,
	};

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTrigger asChild>
					<Button {...buttonProps}>{triggerText}</Button>
				</DrawerTrigger>
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
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button {...buttonProps}>{triggerText}</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader className="text-left">
					<DialogTitle>{dialogTitle}</DialogTitle>
					<DialogDescription>{dialogDescription}</DialogDescription>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}
