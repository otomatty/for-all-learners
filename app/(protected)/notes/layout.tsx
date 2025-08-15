import { getNotesList } from "@/app/_actions/notes/getNotesList";
import { NotesLayoutClient } from "./_components/notes-layout-client";

export default async function NotesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// ユーザーのノート一覧を取得
	const notes = await getNotesList();

	// ノート一覧をサイドバー用の形式に変換
	const sidebarNotes = notes.map((note) => ({
		id: note.id,
		title: note.title,
		slug: note.slug,
		pageCount: note.pageCount,
	}));

	return <NotesLayoutClient notes={sidebarNotes}>{children}</NotesLayoutClient>;
}
