import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import { getNoteDetail } from "@/app/_actions/notes";
import NoteHeader from "./_components/note-header";
import NotePagesClient from "./page-client";

interface NoteDetailPageProps {
	params: Promise<{ slug: string }>;
}

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
	const { slug } = await params;
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		redirect("/auth/login");
	}

	const { note } = await getNoteDetail(slug);

	return (
		<Container className="max-w-7xl">
			<BackLink path="/notes" title="Notes一覧へ戻る" />
			<NoteHeader
				title={note.title}
				slug={note.slug}
				description={note.description}
				visibility={
					note.visibility as "public" | "unlisted" | "invite" | "private"
				}
				pageCount={note.page_count}
				participantCount={note.participant_count}
				updatedAt={note.updated_at}
			/>
			<NotePagesClient slug={slug} totalCount={note.page_count} />
		</Container>
	);
}
