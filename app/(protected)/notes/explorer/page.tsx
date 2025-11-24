import { Container } from "@/components/layouts/container";
import { createClient } from "@/lib/supabase/server";
import NotesExplorer from "./_components/notes-explorer";

export default async function NotesExplorerPage() {
	const supabase = await createClient();

	// 認証チェック
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error("Not authenticated");
	}

	// ユーザーが所有するノートを取得
	const { data: ownedNotes, error: ownedError } = await supabase
		.from("notes")
		.select(
			"id, slug, title, description, visibility, updated_at, page_count, participant_count",
		)
		.eq("owner_id", user.id);

	if (ownedError) {
		throw ownedError;
	}

	// ユーザーに共有されたノートを取得
	const { data: sharedLinks, error: sharedError } = await supabase
		.from("note_shares")
		.select("note_id")
		.eq("shared_with_user_id", user.id);

	if (sharedError) {
		throw sharedError;
	}

	const sharedNoteIds = sharedLinks?.map((s) => s.note_id) || [];
	const { data: sharedNotes, error: sharedNotesError } = sharedNoteIds.length
		? await supabase
				.from("notes")
				.select(
					"id, slug, title, description, visibility, updated_at, page_count, participant_count",
				)
				.in("id", sharedNoteIds)
		: { data: [], error: null };

	if (sharedNotesError) {
		throw sharedNotesError;
	}

	// ノートを結合して重複を除去
	const allNotes = [...(ownedNotes || []), ...(sharedNotes || [])];
	const uniqueNotesMap = new Map(allNotes.map((note) => [note.id, note]));
	const notes = Array.from(uniqueNotesMap.values()).map((n) => ({
		id: n.id,
		slug: n.slug,
		title: n.title,
		description: n.description,
		visibility: n.visibility as "public" | "unlisted" | "invite" | "private",
		pageCount: n.page_count,
		participantCount: n.participant_count,
		updatedAt: n.updated_at || "",
	}));

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
