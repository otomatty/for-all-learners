"use client";

import {
	DndContext,
	type DragEndEvent,
	closestCenter,
	type useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import React from "react";
import { ReleaseNotePreviewSkeleton } from "./ReleaseNotePreviewSkeleton";
import { SortableReleaseNoteItem } from "./SortableReleaseNoteItem";

// Release note item type
export type ReleaseNoteItem = {
	type: "new" | "improvement" | "fix" | "security";
	description: string;
	display_order: number;
};

interface ReleaseNotePreviewProps {
	summaryTitle: string;
	previewItems: ReleaseNoteItem[];
	stagingStatus: string;
	stagingId?: number;
	loadingSummary: boolean;
	loadingConfirm: boolean;
	onCreateSummary: () => void;
	onConfirm: () => void;
	onRemove: (id: number) => void;
	onEdit: (item: ReleaseNoteItem) => void;
	onDragEnd: (event: DragEndEvent) => void;
	sensors: ReturnType<typeof useSensors>;
}

export function ReleaseNotePreview({
	summaryTitle,
	previewItems,
	stagingStatus,
	stagingId,
	loadingSummary,
	loadingConfirm,
	onCreateSummary,
	onConfirm,
	onRemove,
	onEdit,
	onDragEnd,
	sensors,
}: ReleaseNotePreviewProps) {
	return (
		<div className="mt-4 ">
			<button
				type="button"
				onClick={onCreateSummary}
				disabled={loadingSummary}
				className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
			>
				{loadingSummary ? "作成中..." : "要約を作成"}
			</button>
			<span className="text-sm ml-4">
				ステータス:{" "}
				<span
					className={
						stagingStatus === "pending"
							? "text-gray-500"
							: stagingStatus === "processed"
								? "text-blue-600"
								: stagingStatus === "confirmed"
									? "text-green-600"
									: "text-gray-400"
					}
				>
					{stagingStatus}
				</span>
			</span>
			{loadingSummary ? (
				<ReleaseNotePreviewSkeleton />
			) : (
				summaryTitle && (
					<div className="mt-4">
						<h5 className="font-semibold mb-2">要約プレビュー</h5>
						<div className="mb-2">
							<h5 className="font-semibold">タイトル</h5>
							<p className="text-sm text-gray-700">{summaryTitle}</p>
						</div>
						{previewItems.length > 0 && (
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								onDragEnd={onDragEnd}
							>
								<SortableContext
									items={previewItems.map((i) => i.display_order)}
									strategy={verticalListSortingStrategy}
								>
									{previewItems.map((item) => (
										<SortableReleaseNoteItem
											key={item.display_order}
											item={item}
											onRemove={onRemove}
											onEdit={onEdit}
										/>
									))}
								</SortableContext>
							</DndContext>
						)}
						{stagingStatus === "processed" && stagingId && (
							<button
								type="button"
								disabled={loadingConfirm}
								onClick={onConfirm}
								className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
							>
								{loadingConfirm ? "登録中..." : "確定"}
							</button>
						)}
						{stagingStatus === "confirmed" && (
							<span className="ml-4 text-green-600 font-bold">登録済み</span>
						)}
					</div>
				)
			)}
		</div>
	);
}
