import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { DefaultNewPageClient } from "./_components/DefaultNewPageClient";

export async function generateStaticParams() {
	// Return empty array for static export - this route will be handled client-side
	if (process.env.ENABLE_STATIC_EXPORT) {
		return [];
	}
	return [];
}

export default async function DefaultNewPage() {
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);

	if (isStaticExport) {
		return <DefaultNewPageClient />;
	}

	// Initialize Supabase server client
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Redirect to login if not authenticated
	if (!user) {
		redirect("/auth/login");
	}

	// Get or create default note for the user
	const { data: defaultNote, error: noteError } = await supabase
		.from("notes")
		.select("id")
		.eq("owner_id", user.id)
		.eq("is_default_note", true)
		.maybeSingle();

	if (noteError) {
		throw noteError;
	}

	let defaultNoteId: string;

	if (!defaultNote) {
		// Create default note if it doesn't exist
		const defaultSlug = "all-pages";
		const { data: newNote, error: createError } = await supabase
			.from("notes")
			.insert([
				{
					owner_id: user.id,
					slug: defaultSlug,
					title: "すべてのページ",
					description: "ユーザーが作成したすべてのページを含むデフォルトノート",
					visibility: "private",
					is_default_note: true,
				},
			])
			.select("id")
			.single();

		if (createError) {
			throw createError;
		}

		defaultNoteId = newNote.id;
	} else {
		defaultNoteId = defaultNote.id;
	}

	// Insert a blank page with default Tiptap doc
	const defaultContent = {
		type: "doc",
		content: [],
	} as unknown as Database["public"]["Tables"]["pages"]["Row"]["content_tiptap"];
	const { data: page, error: pageError } = await supabase
		.from("pages")
		.insert({
			user_id: user.id,
			title: "",
			content_tiptap: defaultContent,
			is_public: false,
		})
		.select("id")
		.single();

	if (pageError) {
		throw pageError;
	}

	// Link the page to the default note
	const { error: linkError } = await supabase.from("note_page_links").insert({
		note_id: defaultNoteId,
		page_id: page.id,
	});

	if (linkError) {
		throw linkError;
	}

	// Redirect to the newly created page (using ID as temporary slug)
	redirect(`/notes/default/${encodeURIComponent(page.id)}`);
}
