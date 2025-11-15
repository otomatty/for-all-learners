"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CreatePageConfirmDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	pageTitle: string;
	onConfirmCreate: () => Promise<void>;
}

export function CreatePageConfirmDialog({
	isOpen,
	onOpenChange,
	pageTitle,
	onConfirmCreate,
}: CreatePageConfirmDialogProps) {
	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ページを作成しますか？</AlertDialogTitle>
					<AlertDialogDescription>
						「{pageTitle}」というページは存在しません。新しく作成しますか？
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction
						onClick={async (e) => {
							e.preventDefault();
							try {
								await onConfirmCreate();
								// ダイアログを閉じる処理は onConfirmCreate 成功後か、
								// onOpenChange(false) を呼び出すことで行われる想定
							} catch {
								// エラーは呼び出し元で処理される想定
							}
						}}
					>
						作成する
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
