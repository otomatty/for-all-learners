"use client";

import { useTranslations } from "next-intl";
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
		title: "Public Note 1",
		description: "A sample recommended public note.",
		visibility: "public",
		pageCount: 10,
		participantCount: 5,
		updatedAt: "2023-08-05",
	},
	{
		id: "102",
		slug: "public-note-2",
		title: "Public Note 2",
		description: "Another recommended note.",
		visibility: "public",
		pageCount: 8,
		participantCount: 3,
		updatedAt: "2023-07-30",
	},
];

export default function NotesPage() {
	const t = useTranslations("notes");
	const tCommon = useTranslations("common");
	const { data: notes, isLoading, error } = useNotes();

	if (isLoading) {
		return (
			<Container>
				<div className="flex items-center justify-center p-8">
					<p>{tCommon("loading")}</p>
				</div>
			</Container>
		);
	}

	if (error) {
		return (
			<Container>
				<div className="flex items-center justify-center p-8">
					<p className="text-destructive">{tCommon("error")}</p>
				</div>
			</Container>
		);
	}

	return (
		<Container>
			<section className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">{t("myNotes")}</h2>
					<CreateNoteDialog />
				</div>
				<NotesList notes={notes || []} />
			</section>
			<section className="mb-8">
				<h2 className="text-xl font-bold mb-4">{t("recommendedNotes")}</h2>
				<RecommendedPublicNotes notes={mockRecommended} />
			</section>
		</Container>
	);
}
