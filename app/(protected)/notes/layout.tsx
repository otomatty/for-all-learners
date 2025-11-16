"use client";

import { useNotes } from "@/hooks/notes/useNotes";
import { NotesLayoutClient } from "./_components/notes-layout-client";

export default function NotesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: notes, isLoading } = useNotes();

	// ノート一覧をサイドバー用の形式に変換
	const sidebarNotes =
		notes?.map((note) => ({
			id: note.id,
			title: note.title,
			slug: note.slug,
			pageCount: note.pageCount,
		})) || [];

	return (
		<NotesLayoutClient notes={sidebarNotes} isLoading={isLoading}>
			{children}
		</NotesLayoutClient>
	);
}
