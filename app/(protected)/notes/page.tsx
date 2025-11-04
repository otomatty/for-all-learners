import { getNotesList } from "@/app/_actions/notes";
import { Container } from "@/components/layouts/container";
import CreateNoteDialog from "./_components/create-note-dialog";
import type { NoteSummary } from "./_components/notes-list";
import NotesList from "./_components/notes-list";
import RecommendedPublicNotes from "./_components/recommended-public-notes";

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

export default async function NotesPage() {
	const notes: NoteSummary[] = await getNotesList();
	return (
		<Container>
			<section className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">My Notes</h2>
					<CreateNoteDialog />
				</div>
				<NotesList notes={notes} />
			</section>
			<section className="mb-8">
				<h2 className="text-xl font-bold mb-4">おすすめの公開Notes</h2>
				<RecommendedPublicNotes notes={mockRecommended} />
			</section>
		</Container>
	);
}
