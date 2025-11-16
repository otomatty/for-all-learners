"use client";

import {
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { toast } from "sonner";
import {
	batchMovePages,
	checkBatchConflicts,
	deletePagesPermanently,
	moveToTrash,
} from "@/app/_actions/notes";
import { Button } from "@/components/ui/button";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { NoteSummary } from "../../_components/NotesList";
import type { ConflictInfo, ConflictResolution } from "../types";
import { ConflictResolutionDialog } from "./conflict-resolution-dialog";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import DraggedPagePreview from "./dragged-page-preview";
import NotesTree from "./notes-tree";
import OperationPanel from "./operation-panel";
import PagesList from "./pages-list";
import { TrashPanel } from "./trash-panel";

interface NotesExplorerProps {
	notes: NoteSummary[];
}

export default function NotesExplorer({ notes }: NotesExplorerProps) {
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
		notes.length > 0 ? notes[0].id : null,
	);
	const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [draggedPages, setDraggedPages] = useState<
		{ id: string; title: string }[]
	>([]);

	// 競合解決ダイアログの状態
	const [pendingOperation, setPendingOperation] = useState<{
		pageIds: string[];
		targetNoteId: string;
		isCopy: boolean;
		conflicts: ConflictInfo[];
	} | null>(null);

	// 削除確認ダイアログの状態
	const [pendingDelete, setPendingDelete] = useState<{
		pages: Array<{ id: string; title: string; updatedAt?: Date }>;
		noteId: string;
	} | null>(null);

	// ゴミ箱パネルの状態
	const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
	const [showTrashPanel, setShowTrashPanel] = useState(false);

	const selectedNote = notes.find((note) => note.id === selectedNoteId);

	// ドラッグ&ドロップセンサー設定
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// ドラッグ開始
	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event;
		setActiveId(active.id as string);

		// ドラッグ対象のページを取得
		if (selectedPageIds.includes(active.id as string)) {
			// 複数選択されている場合は選択されたページ全て
			// TODO: 実際のページタイトルを取得する必要がある
			setDraggedPages(
				selectedPageIds.map((id) => ({ id, title: `Page ${id}` })),
			);
		} else {
			// 単一ページの場合
			setDraggedPages([
				{ id: active.id as string, title: `Page ${active.id}` },
			]);
		}
	};

	// ドラッグ中
	const handleDragOver = (_event: DragOverEvent) => {
		// 将来的にドロップゾーンのハイライト処理を追加
	};

	// ドラッグ終了
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		setActiveId(null);
		setDraggedPages([]);

		if (!over) return;

		const sourcePageIds = selectedPageIds.includes(active.id as string)
			? selectedPageIds
			: [active.id as string];

		const targetNoteId = over.id as string;
		const sourceNoteId = selectedNoteId;

		// 同じノート内での移動は無視
		if (sourceNoteId === targetNoteId) return;

		// 移動/コピー処理を実行
		handlePageMove(sourcePageIds, targetNoteId, false); // false = 移動, true = コピー
	};

	// ページ移動/コピー処理
	const handlePageMove = async (
		pageIds: string[],
		targetNoteId: string,
		isCopy: boolean,
	) => {
		if (!selectedNoteId) return;

		try {
			toast.loading(`${isCopy ? "コピー" : "移動"}の準備中...`);

			// まず競合をチェック
			const conflicts = await checkBatchConflicts({
				pageIds,
				targetNoteId,
				isCopy,
			});

			toast.dismiss();

			if (conflicts.length > 0) {
				// 競合がある場合はダイアログを表示
				setPendingOperation({
					pageIds,
					targetNoteId,
					isCopy,
					conflicts,
				});
				return;
			}

			// 競合がない場合は直接実行
			await executeBatchMove(pageIds, targetNoteId, isCopy, []);
		} catch (_error) {
			toast.dismiss();
			toast.error("処理に失敗しました");
		}
	};

	// バッチ移動の実行
	const executeBatchMove = async (
		pageIds: string[],
		targetNoteId: string,
		isCopy: boolean,
		conflictResolutions: ConflictResolution[],
	) => {
		if (!selectedNoteId) return;

		try {
			toast.loading(`${isCopy ? "コピー" : "移動"}中...`);

			const result = await batchMovePages({
				pageIds,
				sourceNoteId: selectedNoteId,
				targetNoteId,
				isCopy,
				conflictResolutions,
			});

			toast.dismiss();

			if (result.success) {
				// 成功時
				toast.success(
					`${result.movedPages.length}件のページを${isCopy ? "コピー" : "移動"}しました`,
				);

				// 選択をクリア
				setSelectedPageIds([]);

				// UIを更新（リフレッシュ）
				window.location.reload(); // TODO: より効率的な更新方法を実装
			} else {
				// エラーがある場合
				toast.error(
					`処理中にエラーが発生しました: ${result.errors[0]?.error || "不明なエラー"}`,
				);
			}
		} catch (_error) {
			toast.dismiss();
			toast.error("処理に失敗しました");
		}
	};

	// 競合解決の実行
	const handleConflictResolve = async (resolutions: ConflictResolution[]) => {
		if (!pendingOperation) return;

		const { pageIds, targetNoteId, isCopy } = pendingOperation;
		setPendingOperation(null);

		await executeBatchMove(pageIds, targetNoteId, isCopy, resolutions);
	};

	// 競合解決のキャンセル
	const handleConflictCancel = () => {
		setPendingOperation(null);
		toast.info("操作をキャンセルしました");
	};

	// 削除処理の開始
	const handleDeletePages = async (pageIds: string[]) => {
		if (!selectedNoteId || pageIds.length === 0) return;

		// TODO: 実際のページ情報を取得する
		// 現在は仮のデータを使用
		const pageInfos = pageIds.map((id) => ({
			id,
			title: `Page ${id}`,
			updatedAt: new Date(),
		}));

		setPendingDelete({
			pages: pageInfos,
			noteId: selectedNoteId,
		});
	};

	// 削除の実行
	const handleDeleteConfirm = async (deleteType: "trash" | "permanent") => {
		if (!pendingDelete) return;

		const { pages, noteId } = pendingDelete;
		const pageIds = pages.map((p) => p.id);

		setPendingDelete(null);

		try {
			if (deleteType === "trash") {
				toast.loading("ゴミ箱に移動中...");
				const result = await moveToTrash({ pageIds, noteId });
				toast.dismiss();

				if (result.success) {
					toast.success(result.message);
					setSelectedPageIds([]);
					window.location.reload(); // TODO: より効率的な更新方法を実装
				} else {
					toast.error(result.message);
				}
			} else {
				toast.loading("完全削除中...");
				const result = await deletePagesPermanently({ pageIds });
				toast.dismiss();

				if (result.success) {
					toast.success(result.message);
					setSelectedPageIds([]);
					window.location.reload(); // TODO: より効率的な更新方法を実装
				} else {
					toast.error(result.message);
				}
			}
		} catch (_error) {
			toast.dismiss();
			toast.error("削除に失敗しました");
		}
	};

	// 削除のキャンセル
	const handleDeleteCancel = () => {
		setPendingDelete(null);
		toast.info("削除をキャンセルしました");
	};

	// ゴミ箱復元完了時の処理
	const handleTrashRestoreComplete = () => {
		// ページ一覧を更新
		window.location.reload(); // TODO: より効率的な更新方法を実装
	};

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<div className="h-[calc(100vh-12rem)] border rounded-lg overflow-hidden">
				<ResizablePanelGroup direction="horizontal">
					{/* 左パネル: ノート一覧 */}
					<ResizablePanel defaultSize={30} minSize={20}>
						<div className="h-full border-r bg-muted/30">
							<div className="p-4 border-b">
								<h3 className="font-semibold flex items-center gap-2">
									🗂️ ノート一覧
								</h3>
							</div>
							<NotesTree
								notes={notes}
								selectedNoteId={selectedNoteId}
								onSelectNote={setSelectedNoteId}
							/>
						</div>
					</ResizablePanel>

					<ResizableHandle />

					{/* 右パネル: ページ一覧 */}
					<ResizablePanel defaultSize={70}>
						<div className="h-full flex flex-col">
							<div className="p-4 border-b">
								<h3 className="font-semibold flex items-center gap-2">
									📄 ページ一覧
									{selectedNote && (
										<span className="text-sm text-muted-foreground">
											- {selectedNote.title} ({selectedNote.pageCount}件)
										</span>
									)}
								</h3>
							</div>
							<div className="flex-1 overflow-hidden">
								{selectedNote ? (
									<PagesList
										noteId={selectedNote.id}
										noteSlug={selectedNote.slug}
										selectedPageIds={selectedPageIds}
										onSelectPages={setSelectedPageIds}
									/>
								) : (
									<div className="h-full flex items-center justify-center text-muted-foreground">
										左側のノートを選択してください
									</div>
								)}
							</div>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>

				{/* 下部パネル: 操作エリア */}
				<OperationPanel
					selectedPageIds={selectedPageIds}
					onClearSelection={() => setSelectedPageIds([])}
					onMovePages={(targetNoteId) =>
						handlePageMove(selectedPageIds, targetNoteId, false)
					}
					onCopyPages={(targetNoteId) =>
						handlePageMove(selectedPageIds, targetNoteId, true)
					}
					onDeletePages={() => handleDeletePages(selectedPageIds)}
					onToggleTrash={() => setShowTrashPanel(!showTrashPanel)}
					showTrashPanel={showTrashPanel}
					notes={notes}
				/>
			</div>

			{/* ドラッグオーバーレイ */}
			<DragOverlay>
				{activeId ? <DraggedPagePreview pages={draggedPages} /> : null}
			</DragOverlay>

			{/* 競合解決ダイアログ */}
			<ConflictResolutionDialog
				open={!!pendingOperation}
				conflicts={pendingOperation?.conflicts || []}
				onResolve={handleConflictResolve}
				onCancel={handleConflictCancel}
			/>

			{/* 削除確認ダイアログ */}
			<DeleteConfirmationDialog
				open={!!pendingDelete}
				pages={pendingDelete?.pages || []}
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>

			{/* ゴミ箱パネル */}
			{showTrashPanel && (
				<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
					<div className="bg-background rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
						<div className="p-4 border-b flex items-center justify-between">
							<h2 className="text-lg font-semibold">ゴミ箱</h2>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowTrashPanel(false)}
							>
								×
							</Button>
						</div>
						<div className="flex-1 overflow-hidden">
							<TrashPanel
								selectedTrashIds={selectedTrashIds}
								onSelectTrash={setSelectedTrashIds}
								onRestoreComplete={handleTrashRestoreComplete}
							/>
						</div>
					</div>
				</div>
			)}
		</DndContext>
	);
}
