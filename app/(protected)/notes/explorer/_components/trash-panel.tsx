"use client";

import {
	AlertTriangleIcon,
	CalendarIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	TrashIcon,
	XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	deletePagesPermanently,
	getTrashItems,
	restoreFromTrash,
	type TrashItem,
} from "@/app/_actions/notes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface TrashPanelProps {
	selectedTrashIds: string[];
	onSelectTrash: (trashIds: string[]) => void;
	onRestoreComplete: () => void;
}

export function TrashPanel({
	selectedTrashIds,
	onSelectTrash,
	onRestoreComplete,
}: TrashPanelProps) {
	const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [totalCount, setTotalCount] = useState(0);

	// ゴミ箱アイテムを読み込み
	const loadTrashItems = useCallback(async () => {
		setLoading(true);
		try {
			const result = await getTrashItems({ limit: 100 });
			if (result.success) {
				setTrashItems(result.trashItems);
				setTotalCount(result.totalCount);
			} else {
				toast.error(result.message || "ゴミ箱の読み込みに失敗しました");
			}
		} catch (_error) {
			toast.error("ゴミ箱の読み込みに失敗しました");
		}
		setLoading(false);
	}, []);

	// 初回読み込み
	useEffect(() => {
		loadTrashItems();
	}, [loadTrashItems]);

	// 選択状態の切り替え
	const toggleSelection = (trashId: string) => {
		const newSelection = selectedTrashIds.includes(trashId)
			? selectedTrashIds.filter((id) => id !== trashId)
			: [...selectedTrashIds, trashId];
		onSelectTrash(newSelection);
	};

	// 全選択/全解除
	const toggleSelectAll = () => {
		if (selectedTrashIds.length === trashItems.length) {
			onSelectTrash([]);
		} else {
			onSelectTrash(trashItems.map((item) => item.id));
		}
	};

	// 復元処理
	const handleRestore = async (targetNoteId?: string) => {
		if (selectedTrashIds.length === 0) {
			toast.warning("復元するアイテムを選択してください");
			return;
		}

		try {
			toast.loading("復元中...");
			const result = await restoreFromTrash({
				trashIds: selectedTrashIds,
				targetNoteId,
			});

			toast.dismiss();

			if (result.success) {
				toast.success(result.message);
				onSelectTrash([]);
				loadTrashItems();
				onRestoreComplete();
			} else {
				toast.error(result.message);
			}
		} catch (_error) {
			toast.dismiss();
			toast.error("復元に失敗しました");
		}
	};

	// 完全削除処理
	const handlePermanentDelete = async () => {
		if (selectedTrashIds.length === 0) {
			toast.warning("削除するアイテムを選択してください");
			return;
		}

		// 選択されたアイテムからページIDを取得
		const selectedItems = trashItems.filter((item) =>
			selectedTrashIds.includes(item.id),
		);
		const pageIds = selectedItems.map((item) => item.pageId);

		try {
			toast.loading("完全削除中...");
			const result = await deletePagesPermanently({ pageIds });

			toast.dismiss();

			if (result.success) {
				toast.success(result.message);
				onSelectTrash([]);
				loadTrashItems();
			} else {
				toast.error(result.message);
			}
		} catch (_error) {
			toast.dismiss();
			toast.error("完全削除に失敗しました");
		}
	};

	// 自動削除までの日数を計算
	const getDaysUntilAutoDelete = (autoDeleteAt?: Date | null) => {
		if (!autoDeleteAt) return null;
		const now = new Date();
		const diffTime = autoDeleteAt.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	};

	return (
		<div className="h-full flex flex-col border rounded-lg bg-card">
			{/* ヘッダー */}
			<div className="p-4 border-b">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TrashIcon className="h-5 w-5" />
						<h3 className="font-semibold">ゴミ箱</h3>
						<Badge variant="secondary">{totalCount}件</Badge>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={loadTrashItems}
						disabled={loading}
					>
						<RefreshCwIcon
							className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>

				{/* 操作ボタン */}
				{selectedTrashIds.length > 0 && (
					<div className="flex items-center gap-2 mt-3">
						<Button variant="outline" size="sm" onClick={() => handleRestore()}>
							<RotateCcwIcon className="h-4 w-4 mr-1" />
							復元 ({selectedTrashIds.length})
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handlePermanentDelete}
						>
							<XIcon className="h-4 w-4 mr-1" />
							完全削除
						</Button>
						<Button variant="ghost" size="sm" onClick={() => onSelectTrash([])}>
							選択解除
						</Button>
					</div>
				)}
			</div>

			{/* アイテム一覧 */}
			<div className="flex-1 overflow-hidden">
				{trashItems.length === 0 ? (
					<div className="h-full flex items-center justify-center text-muted-foreground">
						<div className="text-center">
							<TrashIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p>ゴミ箱は空です</p>
						</div>
					</div>
				) : (
					<>
						{/* 全選択チェックボックス */}
						<div className="p-3 border-b bg-muted/30">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={
										selectedTrashIds.length === trashItems.length &&
										trashItems.length > 0
									}
									onChange={toggleSelectAll}
									className="rounded"
								/>
								<span className="text-sm">
									全選択 ({selectedTrashIds.length}/{trashItems.length})
								</span>
							</label>
						</div>

						<ScrollArea className="flex-1">
							<div className="p-2">
								{trashItems.map((item, index) => {
									const daysUntilDelete = getDaysUntilAutoDelete(
										item.autoDeleteAt,
									);
									const isExpiringSoon =
										daysUntilDelete !== null && daysUntilDelete <= 7;

									return (
										<div key={item.id}>
											<div
												className={`p-3 rounded-md cursor-pointer transition-colors ${
													selectedTrashIds.includes(item.id)
														? "bg-primary/10 border border-primary/20"
														: "hover:bg-muted/50"
												}`}
												onClick={() => toggleSelection(item.id)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														toggleSelection(item.id);
													}
												}}
											>
												<div className="flex items-start gap-3">
													<input
														type="checkbox"
														checked={selectedTrashIds.includes(item.id)}
														onChange={() => toggleSelection(item.id)}
														className="mt-1 rounded"
														onClick={(e) => e.stopPropagation()}
													/>
													<div className="flex-1 min-w-0">
														<p className="font-medium truncate">
															{item.pageTitle}
														</p>
														<div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
															<span className="flex items-center gap-1">
																<CalendarIcon className="h-3 w-3" />
																削除: {item.deletedAt.toLocaleDateString()}
															</span>
															{item.originalNoteTitle && (
																<span>元ノート: {item.originalNoteTitle}</span>
															)}
														</div>
														{isExpiringSoon && (
															<div className="flex items-center gap-1 mt-1">
																<AlertTriangleIcon className="h-3 w-3 text-orange-500" />
																<span className="text-xs text-orange-600">
																	{daysUntilDelete}日後に自動削除
																</span>
															</div>
														)}
													</div>
												</div>
											</div>
											{index < trashItems.length - 1 && (
												<Separator className="my-1" />
											)}
										</div>
									);
								})}
							</div>
						</ScrollArea>
					</>
				)}
			</div>

			{/* フッター */}
			{trashItems.length > 0 && (
				<div className="p-3 border-t bg-muted/30">
					<Alert>
						<AlertTriangleIcon className="h-4 w-4" />
						<AlertDescription className="text-xs">
							ゴミ箱のアイテムは30日後に自動的に完全削除されます
						</AlertDescription>
					</Alert>
				</div>
			)}
		</div>
	);
}
