"use client";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useState } from "react";
import type { NoteSummary } from "../../_components/notes-list";
import NotesTree from "./notes-tree";
import OperationPanel from "./operation-panel";
import PagesList from "./pages-list";
import {
	DndContext,
	DragOverlay,
	useSensor,
	useSensors,
	PointerSensor,
	KeyboardSensor,
	DragStartEvent,
	DragEndEvent,
	DragOverEvent,
} from "@dnd-kit/core";
import {
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import DraggedPagePreview from "./dragged-page-preview";
import { batchMovePages } from "@/app/_actions/notes";
import { toast } from "sonner";

interface NotesExplorerProps {
	notes: NoteSummary[];
}

export default function NotesExplorer({ notes }: NotesExplorerProps) {
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
		notes.length > 0 ? notes[0].id : null,
	);
	const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [draggedPages, setDraggedPages] = useState<{ id: string; title: string }[]>([]);

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
		})
	);

	// ドラッグ開始
	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event;
		setActiveId(active.id as string);

		// ドラッグ対象のページを取得
		if (selectedPageIds.includes(active.id as string)) {
			// 複数選択されている場合は選択されたページ全て
			// TODO: 実際のページタイトルを取得する必要がある
			setDraggedPages(selectedPageIds.map(id => ({ id, title: `Page ${id}` })));
		} else {
			// 単一ページの場合
			setDraggedPages([{ id: active.id as string, title: `Page ${active.id}` }]);
		}
	};

	// ドラッグ中
	const handleDragOver = (event: DragOverEvent) => {
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
	const handlePageMove = async (pageIds: string[], targetNoteId: string, isCopy: boolean) => {
		if (!selectedNoteId) return;

		try {
			toast.loading(`${isCopy ? 'コピー' : '移動'}中...`);

			const result = await batchMovePages({
				pageIds,
				sourceNoteId: selectedNoteId,
				targetNoteId,
				isCopy,
				conflictResolutions: [] // まずは競合解決なしで実行
			});

			toast.dismiss();

			if (result.success && result.conflicts.length === 0) {
				// 成功時
				toast.success(`${result.movedPages.length}件のページを${isCopy ? 'コピー' : '移動'}しました`);
				
				// 選択をクリア
				setSelectedPageIds([]);
				
				// UIを更新（リフレッシュ）
				window.location.reload(); // TODO: より効率的な更新方法を実装
				
			} else if (result.conflicts.length > 0) {
				// 競合がある場合
				toast.warning(`${result.conflicts.length}件の同名競合があります`);
				
				// TODO: 競合解決ダイアログを表示
				console.log("競合:", result.conflicts);
				
			} else {
				// エラーがある場合
				toast.error(`処理中にエラーが発生しました: ${result.errors[0]?.error || '不明なエラー'}`);
			}

		} catch (error) {
			toast.dismiss();
			toast.error('処理に失敗しました');
			console.error('ページ移動エラー:', error);
		}
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
					onMovePages={(targetNoteId) => handlePageMove(selectedPageIds, targetNoteId, false)}
					onCopyPages={(targetNoteId) => handlePageMove(selectedPageIds, targetNoteId, true)}
					notes={notes}
				/>
			</div>

			{/* ドラッグオーバーレイ */}
			<DragOverlay>
				{activeId ? (
					<DraggedPagePreview pages={draggedPages} />
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
