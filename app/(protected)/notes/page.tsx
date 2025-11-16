"use client";

import { Container } from "@/components/layouts/container";
import { useNotes } from "@/hooks/notes/useNotes";
import CreateNoteDialog from "./_components/CreateNoteDialog";
import type { NoteSummary } from "./_components/NotesList";
import NotesList from "./_components/NotesList";
import RecommendedPublicNotes from "./_components/RecommendedPublicNotes";

const mockRecommended: NoteSummary[] = [
	{
		id: "101",
		slug: "public-note-1",
		title: "公開ノート1",
		description: "おすすめの公開ノートサンプル。",
		visibility: "public",
		pageCount: 10,
		participantCount: 5,
		updatedAt: "2023-08-05",
	},
	{
		id: "102",
		slug: "public-note-2",
		title: "公開ノート2",
		description: "もう一つのおすすめノート。",
		visibility: "public",
		pageCount: 8,
		participantCount: 3,
		updatedAt: "2023-07-30",
	},
];

export default function NotesPage() {
	const { data: notes, isLoading, error } = useNotes();

	if (isLoading) {
		return (
			<Container>
				<div className="flex items-center justify-center p-8">
					<p>読み込み中...</p>
				</div>
			</Container>
		);
	}

	if (error) {
		return (
			<Container>
				<div className="flex items-center justify-center p-8">
					<p className="text-destructive">エラーが発生しました</p>
				</div>
			</Container>
		);
	}

	return (
		<Container>
			<section className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">My Notes</h2>
					<CreateNoteDialog />
				</div>
				<NotesList notes={notes || []} />
			</section>
			<section className="mb-8">
				<h2 className="text-xl font-bold mb-4">おすすめの公開Notes</h2>
				<RecommendedPublicNotes notes={mockRecommended} />
			</section>
		</Container>
	);
}
