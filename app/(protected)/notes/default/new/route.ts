import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

// Static export: Route handlers are not supported in static export mode
// This route handler will be disabled during static export builds
export const dynamic = "force-static";
export const revalidate = false;

export async function GET(req: NextRequest) {
	// Initialize Supabase server client
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Redirect to login if not authenticated
	if (!user) {
		return NextResponse.redirect(new URL("/auth/login", req.url));
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
	return NextResponse.redirect(
		new URL(`/notes/default/${encodeURIComponent(page.id)}`, req.url),
	);
}
