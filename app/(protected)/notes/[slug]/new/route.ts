import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

// Static export: Route handlers are not supported in static export mode
// This route handler will be disabled during static export builds
export const dynamic = "force-static";
export const revalidate = false;

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		return NextResponse.redirect(new URL("/auth/login", req.url));
	}

	// Fetch note ID by slug
	const { data: note, error: noteError } = await supabase
		.from("notes")
		.select("id")
		.eq("slug", slug)
		.single();
	if (noteError || !note) {
		return NextResponse.json({ error: "Note not found" }, { status: 404 });
	}

	// Default empty Tiptap document
	const defaultContent = {
		type: "doc",
		content: [],
	} as unknown as Database["public"]["Tables"]["pages"]["Row"]["content_tiptap"];

	// Create new page
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
	if (pageError || !page) {
		throw pageError;
	}

	// Link page to note
	const { error: linkError } = await supabase
		.from("note_page_links")
		.insert({ note_id: note.id, page_id: page.id });
	if (linkError) {
		throw linkError;
	}

	// Redirect to new page under note
	return NextResponse.redirect(
		new URL(
			`/notes/${encodeURIComponent(slug)}/${encodeURIComponent(page.id)}`,
			req.url,
		),
	);
}
