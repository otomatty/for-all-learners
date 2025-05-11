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

interface DeletePageDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	pageTitle: string;
	onConfirmDelete: () => Promise<void>;
}

export function DeletePageDialog({
	isOpen,
	onOpenChange,
	pageTitle,
	onConfirmDelete,
}: DeletePageDialogProps) {
	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>本当にページを削除しますか？</AlertDialogTitle>
					<AlertDialogDescription>
						この操作は元に戻せません。ページ「{pageTitle}
						」とそのすべてのコンテンツが完全に削除されます。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction
						onClick={async (e) => {
							e.preventDefault();
							await onConfirmDelete();
							// ダイアログを閉じる処理は onConfirmDelete 成功後か、
							// onOpenChange(false) を呼び出すことで行われる想定
						}}
						className="bg-red-600 hover:bg-red-700 text-white"
					>
						削除する
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
