"use client";

import {
	DndContext,
	type DragEndEvent,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronRight, FolderOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type Note = {
	id: string;
	title: string;
	slug: string;
	pageCount: number;
};

type NotesExplorerSidebarProps = {
	notes: Note[];
	onPageMove?: (
		pageIds: string[],
		targetNoteId: string,
		isCopy: boolean,
	) => Promise<void>;
};

export function NotesExplorerSidebar({
	notes,
	onPageMove,
}: NotesExplorerSidebarProps) {
	const pathname = usePathname();
	const [activeId, setActiveId] = useState<string | null>(null);

	// 現在のノートとページの識別
	const pathSegments = pathname.split("/").filter(Boolean);
	const currentNoteSlug = pathSegments[1] === "notes" ? pathSegments[2] : null;
	const currentPageId =
		pathSegments[1] === "notes" && pathSegments[3] ? pathSegments[3] : null;

	const currentNote = notes.find((note) => note.slug === currentNoteSlug);

	// CRITICAL FIX: Remove duplicate IDs
	// Create a unique set of notes by ID to prevent duplicate key error
	const uniqueNotes = notes.reduce((acc, note) => {
		if (!acc.find((n) => n.id === note.id)) {
			acc.push(note);
		}
		return acc;
	}, [] as Note[]);

	// ドラッグ&ドロップセンサー設定
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over || !onPageMove) return;

		const targetNoteId = over.id as string;
		const pageIds = [active.id as string]; // 現在のページ

		// 同じノート内での移動は無視
		if (currentNote?.id === targetNoteId) return;

		// ページ移動処理を実行
		await onPageMove(pageIds, targetNoteId, false);
	};

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<Sidebar side="left" variant="floating" collapsible="offcanvas">
				<SidebarHeader>
					<div className="flex items-center gap-2 px-2 py-1">
						<FolderOpen className="h-4 w-4" />
						<span className="font-semibold">ノートエクスプローラー</span>
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>ノート一覧</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SortableContext
									items={uniqueNotes.map((note) => note.id)}
									strategy={verticalListSortingStrategy}
								>
									{uniqueNotes.map((note) => {
										const isCurrentNote = note.slug === currentNoteSlug;

										return (
											<SidebarMenuItem key={note.id}>
												<SidebarMenuButton
													asChild
													isActive={isCurrentNote}
													className={cn(
														"relative",
														isCurrentNote && "bg-sidebar-accent",
													)}
												>
													<div
														id={note.id}
														className="flex items-center justify-between w-full cursor-pointer"
													>
														<div className="flex items-center gap-2 flex-1">
															<ChevronRight className="h-3 w-3" />
															<span className="truncate">{note.title}</span>
														</div>
														<span className="text-xs text-muted-foreground">
															{note.pageCount}
														</span>
														{isCurrentNote && currentPageId && (
															<div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
														)}
													</div>
												</SidebarMenuButton>
											</SidebarMenuItem>
										);
									})}
								</SortableContext>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</DndContext>
	);
}
