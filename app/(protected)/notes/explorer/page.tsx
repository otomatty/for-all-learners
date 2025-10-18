import React from "react";
import { getNotesList } from "@/app/_actions/notes";
import { Container } from "@/components/container";
import NotesExplorer from "./_components/notes-explorer";

export default async function NotesExplorerPage() {
	const notes = await getNotesList();

	return (
		<Container className="h-full">
			<div className="mb-4">
				<h1 className="text-2xl font-bold">ノート・ページ管理</h1>
				<p className="text-muted-foreground">
					ドラッグ&ドロップでページを整理できます
				</p>
			</div>
			<NotesExplorer notes={notes} />
		</Container>
	);
}
