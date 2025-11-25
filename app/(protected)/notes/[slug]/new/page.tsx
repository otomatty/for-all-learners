import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { NewPageClient } from "./_components/NewPageClient";

interface NewPageProps {
	params: Promise<{ slug: string }>;
}

// Generate static params for dynamic routes
// Returns empty array to enable dynamic rendering for all routes
// Phase 6: Next.js静的化とTauri統合 (Issue #157)
export async function generateStaticParams() {
	return [];
}

export default async function NewPage({ params }: NewPageProps) {
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);

	if (isStaticExport) {
		return <NewPageClient />;
	}

	const { slug } = await params;
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		redirect("/auth/login");
	}

	// Fetch note ID by slug
	const { data: note, error: noteError } = await supabase
		.from("notes")
		.select("id")
		.eq("slug", slug)
		.single();
	if (noteError || !note) {
		throw new Error("Note not found");
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
	redirect(`/notes/${encodeURIComponent(slug)}/${encodeURIComponent(page.id)}`);
}
