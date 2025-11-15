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

interface DeleteEmptyTitlePageDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirmDelete: () => Promise<void>;
}

export function DeleteEmptyTitlePageDialog({
	isOpen,
	onOpenChange,
	onConfirmDelete,
}: DeleteEmptyTitlePageDialogProps) {
	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ページを削除しますか？</AlertDialogTitle>
					<AlertDialogDescription>
						タイトルが空のページは自動的に削除されます。この操作は取り消せません。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction
						onClick={async (e) => {
							e.preventDefault();
							try {
								await onConfirmDelete();
								onOpenChange(false);
							} catch {
								// エラーは呼び出し元で処理される想定
							}
						}}
					>
						削除する
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
