"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConflictResolutionDialog } from "@/app/(protected)/notes/explorer/_components/conflict-resolution-dialog";
import type {
	ConflictInfo,
	ConflictResolution,
} from "@/app/(protected)/notes/explorer/types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useBatchMovePages } from "@/hooks/notes/useBatchMovePages";
import { useCheckBatchConflicts } from "@/hooks/notes/useCheckBatchConflicts";
import { NotesExplorerSidebar } from "./notes-sidebar";

type Note = {
	id: string;
	title: string;
	slug: string;
	pageCount: number;
};

type NotesLayoutClientProps = {
	notes: Note[];
	children: React.ReactNode;
	isLoading?: boolean;
};

export function NotesLayoutClient({
	notes,
	children,
	isLoading,
}: NotesLayoutClientProps) {
	const [pendingOperation, setPendingOperation] = useState<{
		pageIds: string[];
		targetNoteId: string;
		isCopy: boolean;
		conflicts: ConflictInfo[];
	} | null>(null);

	const checkBatchConflicts = useCheckBatchConflicts();
	const batchMovePages = useBatchMovePages();

	const handlePageMove = async (
		pageIds: string[],
		targetNoteId: string,
		isCopy: boolean,
	) => {
		try {
			toast.loading(`${isCopy ? "コピー" : "移動"}の準備中...`);

			// まず競合をチェック
			const conflicts = await checkBatchConflicts.mutateAsync({
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

	const executeBatchMove = async (
		pageIds: string[],
		targetNoteId: string,
		isCopy: boolean,
		conflictResolutions: ConflictResolution[],
	) => {
		// 現在のノートIDをURLから取得
		const pathSegments = window.location.pathname.split("/").filter(Boolean);
		const currentNoteSlug =
			pathSegments[1] === "notes" ? pathSegments[2] : null;
		const currentNote = notes.find((note) => note.slug === currentNoteSlug);

		if (!currentNote) {
			toast.error("現在のノートが特定できません");
			return;
		}

		try {
			toast.loading(`${isCopy ? "コピー" : "移動"}中...`);

			const result = await batchMovePages.mutateAsync({
				pageIds,
				sourceNoteId: currentNote.id,
				targetNoteId,
				isCopy,
				conflictResolutions,
			});

			toast.dismiss();

			if (result.success) {
				toast.success(
					`${result.movedPages.length}件のページを${isCopy ? "コピー" : "移動"}しました`,
				);

				// UIを更新（リフレッシュ）
				window.location.reload();
			} else {
				toast.error(
					`処理中にエラーが発生しました: ${result.errors[0]?.error || "不明なエラー"}`,
				);
			}
		} catch (_error) {
			toast.dismiss();
			toast.error("処理に失敗しました");
		}
	};

	const handleConflictResolve = async (resolutions: ConflictResolution[]) => {
		if (!pendingOperation) return;

		const { pageIds, targetNoteId, isCopy } = pendingOperation;
		setPendingOperation(null);

		await executeBatchMove(pageIds, targetNoteId, isCopy, resolutions);
	};

	const handleConflictCancel = () => {
		setPendingOperation(null);
		toast.info("操作をキャンセルしました");
	};

	return (
		<SidebarProvider defaultOpen={false}>
			<NotesExplorerSidebar notes={notes} onPageMove={handlePageMove} />
			<SidebarInset className="bg-secondary">{children}</SidebarInset>
			{pendingOperation && (
				<ConflictResolutionDialog
					open={!!pendingOperation}
					conflicts={pendingOperation.conflicts}
					onResolve={handleConflictResolve}
					onCancel={handleConflictCancel}
				/>
			)}
		</SidebarProvider>
	);
}
