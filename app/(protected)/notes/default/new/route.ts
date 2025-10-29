import { type NextRequest, NextResponse } from "next/server";
import { getDefaultNote } from "@/app/_actions/notes";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

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
	const defaultNote = await getDefaultNote();

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
		note_id: defaultNote.id,
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
