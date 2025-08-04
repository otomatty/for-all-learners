"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { AlertTriangleIcon, FileIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

interface PageInfo {
	id: string;
	title: string;
	updatedAt?: Date;
}

interface DeleteConfirmationDialogProps {
	open: boolean;
	pages: PageInfo[];
	onConfirm: (deleteType: "trash" | "permanent") => void;
	onCancel: () => void;
}

export function DeleteConfirmationDialog({
	open,
	pages,
	onConfirm,
	onCancel,
}: DeleteConfirmationDialogProps) {
	const [deleteType, setDeleteType] = useState<"trash" | "permanent">("trash");

	const handleConfirm = () => {
		onConfirm(deleteType);
	};

	return (
		<Dialog open={open} onOpenChange={onCancel}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<TrashIcon className="h-5 w-5 text-destructive" />
						ページの削除確認
						<Badge variant="secondary">{pages.length}件のページ</Badge>
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						以下のページを削除します。削除方法を選択してください。
					</p>

					{/* 削除対象ページ一覧 */}
					<div className="max-h-48 overflow-y-auto border rounded-md">
						{pages.map((page, index) => (
							<div key={page.id}>
								<div className="flex items-center gap-2 p-3">
									<FileIcon className="h-4 w-4 text-muted-foreground" />
									<div className="flex-1 min-w-0">
										<p className="font-medium truncate">{page.title}</p>
										{page.updatedAt && (
											<p className="text-xs text-muted-foreground">
												更新: {page.updatedAt.toLocaleDateString()}
											</p>
										)}
									</div>
								</div>
								{index < pages.length - 1 && <Separator />}
							</div>
						))}
					</div>

					{/* 削除方法の選択 */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium">削除方法を選択:</h4>
						<RadioGroup
							value={deleteType}
							onValueChange={(value) =>
								setDeleteType(value as "trash" | "permanent")
							}
						>
							{/* ゴミ箱に移動 */}
							<div className="flex items-start space-x-3">
								<RadioGroupItem value="trash" id="trash" className="mt-1" />
								<div className="flex-1">
									<Label htmlFor="trash" className="text-base font-medium">
										ゴミ箱に移動（推奨）
									</Label>
									<p className="text-sm text-muted-foreground mt-1">
										30日後に自動的に完全削除されます。それまでは復元可能です。
									</p>
								</div>
							</div>

							{/* 完全削除 */}
							<div className="flex items-start space-x-3">
								<RadioGroupItem
									value="permanent"
									id="permanent"
									className="mt-1"
								/>
								<div className="flex-1">
									<Label
										htmlFor="permanent"
										className="text-base font-medium text-destructive"
									>
										完全削除
									</Label>
									<p className="text-sm text-muted-foreground mt-1">
										すぐに削除され、元に戻すことはできません。
									</p>
								</div>
							</div>
						</RadioGroup>
					</div>

					{/* 完全削除の警告 */}
					{deleteType === "permanent" && (
						<Alert variant="destructive">
							<AlertTriangleIcon className="h-4 w-4" />
							<AlertDescription>
								<strong>警告:</strong> 完全削除したページは復元できません。
								本当に削除してよろしいですか？
							</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						キャンセル
					</Button>
					<Button
						variant={deleteType === "permanent" ? "destructive" : "default"}
						onClick={handleConfirm}
					>
						{deleteType === "trash" ? (
							<>
								<TrashIcon className="h-4 w-4 mr-2" />
								ゴミ箱に移動
							</>
						) : (
							<>
								<AlertTriangleIcon className="h-4 w-4 mr-2" />
								完全削除
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
