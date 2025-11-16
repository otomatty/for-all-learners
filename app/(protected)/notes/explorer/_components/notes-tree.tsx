"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NoteSummary } from "../../_components/NotesList";
import DroppableNoteItem from "./droppable-note-item";

interface NotesTreeProps {
	notes: NoteSummary[];
	selectedNoteId: string | null;
	onSelectNote: (noteId: string) => void;
}

export default function NotesTree({
	notes,
	selectedNoteId,
	onSelectNote,
}: NotesTreeProps) {
	return (
		<div className="h-full flex flex-col">
			{/* 新規作成ボタン */}
			<div className="p-3 border-b">
				<Button
					variant="outline"
					size="sm"
					className="w-full justify-start gap-2"
				>
					<Plus className="h-4 w-4" />
					新しいノート
				</Button>
			</div>

			{/* ノート一覧 */}
			<ScrollArea className="flex-1">
				<div className="p-2 space-y-1">
					{notes.map((note) => {
						const isSelected = note.id === selectedNoteId;
						return (
							<DroppableNoteItem
								key={note.id}
								note={note}
								isSelected={isSelected}
								onSelect={onSelectNote}
							/>
						);
					})}
				</div>
			</ScrollArea>

			{/* 統計情報 */}
			<div className="p-3 border-t text-xs text-muted-foreground">
				合計: {notes.length}個のノート
			</div>
		</div>
	);
}
