"use client"; // ダイアログの状態管理のためクライアントコンポーネントに

import { useState } from "react";
import type { ChangeLogEntry } from "@/app/_actions/changelog";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog"; // ResponsiveDialog をインポート
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
import { Button } from "@/components/ui/button"; // Button をインポート
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChangelogData, useDeleteChangelogEntry } from "@/hooks/changelog";
import { ChangelogEntryItem } from "./_components/ChangelogEntryItem";
import { ChangelogForm } from "./_components/ChangelogForm";
import { ChangelogHeader } from "./_components/ChangelogHeader";
import { CommitHistorySection } from "./_components/CommitHistorySection";
import { EmptyChangelogMessage } from "./_components/EmptyChangelogMessage";

export default function ChangelogPage() {
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingEntry, setEditingEntry] = useState<ChangeLogEntry | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const { data: changelogEntries = [], isLoading } = useChangelogData();
	const deleteChangelogEntryMutation = useDeleteChangelogEntry();

	const handleCreateFormSuccess = () => {
		setIsCreateDialogOpen(false);
		alert("更新履歴が作成されました。"); // ChangelogFormから移動
	};

	const handleEditFormSuccess = () => {
		setIsEditDialogOpen(false);
		setEditingEntry(null);
		alert("更新履歴が更新されました。");
	};

	const handleOpenEditDialog = (entry: ChangeLogEntry) => {
		setEditingEntry(entry);
		setIsEditDialogOpen(true);
	};

	const handleOpenDeleteDialog = (entryId: string) => {
		setDeletingEntryId(entryId);
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!deletingEntryId) return;
		deleteChangelogEntryMutation.mutate(deletingEntryId, {
			onSuccess: (result) => {
				setDeletingEntryId(null);
				setIsDeleteDialogOpen(false);
				alert(
					result.success
						? "更新履歴が削除されました。"
						: `削除に失敗しました: ${result.error || "不明なエラー"}`,
				);
			},
			onError: (error) => {
				setDeletingEntryId(null);
				setIsDeleteDialogOpen(false);
				alert(`削除に失敗しました: ${error.message || "不明なエラー"}`);
			},
		});
	};

	return (
		<div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
			<Tabs defaultValue="changes">
				<TabsList className="mb-6">
					<TabsTrigger value="changes">更新履歴</TabsTrigger>
					<TabsTrigger value="commits">コミット履歴</TabsTrigger>
				</TabsList>
				<TabsContent value="changes">
					<ChangelogHeader />
					<div className="mb-6 text-right">
						<Button onClick={() => setIsCreateDialogOpen(true)}>
							新規作成
						</Button>
					</div>

					{isLoading && <p className="text-center py-10">読み込み中...</p>}
					{!isLoading && changelogEntries.length === 0 && (
						<EmptyChangelogMessage />
					)}
					{!isLoading && changelogEntries.length > 0 && (
						<div className="space-y-12">
							{changelogEntries.map((entry: ChangeLogEntry) => (
								<ChangelogEntryItem
									key={entry.id}
									entry={entry}
									onEdit={handleOpenEditDialog}
									onDelete={handleOpenDeleteDialog}
								/>
							))}
						</div>
					)}

					<ResponsiveDialog
						open={isCreateDialogOpen}
						onOpenChange={setIsCreateDialogOpen}
						dialogTitle="更新履歴 新規作成"
						dialogDescription="新しいバージョンの変更点を記録します。"
						className="sm:max-w-2xl" // ダイアログの幅を調整
					>
						<div className="pt-4">
							{" "}
							{/* フォームとダイアログヘッダーの間に少しスペース */}
							<ChangelogForm
								onSuccess={handleCreateFormSuccess}
								onCancel={() => setIsCreateDialogOpen(false)}
							/>
						</div>
					</ResponsiveDialog>

					{editingEntry && (
						<ResponsiveDialog
							open={isEditDialogOpen}
							onOpenChange={(open) => {
								setIsEditDialogOpen(open);
								if (!open) setEditingEntry(null); // ダイアログが閉じられたら編集対象をクリア
							}}
							dialogTitle={`更新履歴 編集 (v${editingEntry.version})`}
							dialogDescription="既存の変更点を編集します。"
							className="sm:max-w-2xl"
						>
							<div className="pt-4">
								<ChangelogForm
									initialData={editingEntry}
									onSuccess={handleEditFormSuccess}
									onCancel={() => {
										setIsEditDialogOpen(false);
										setEditingEntry(null);
									}}
								/>
							</div>
						</ResponsiveDialog>
					)}
					<AlertDialog
						open={isDeleteDialogOpen}
						onOpenChange={setIsDeleteDialogOpen}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
								<AlertDialogDescription>
									この操作は元に戻せません。この更新履歴エントリを完全に削除します。
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel onClick={() => setDeletingEntryId(null)}>
									キャンセル
								</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleDeleteConfirm}
									className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus-visible:ring-red-500"
								>
									削除する
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</TabsContent>
				<TabsContent value="commits">
					<CommitHistorySection />
				</TabsContent>
			</Tabs>
		</div>
	);
}
