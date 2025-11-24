import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * GET /api/notes/[slug]/pages - Get pages for a note
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   ├─ app/(protected)/notes/[slug]/page-client.tsx
 *
 * Dependencies (External files that this route uses):
 *   ├─ @/lib/supabase/server (createClient)
 *   └─ @/types/database.types (Database)
 *
 * Related Documentation:
 *   ├─ Hook: hooks/notes/useNotePages.ts
 *   └─ RPC Function: database/migrations/20240501000000_add_get_note_pages_rpc.sql
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	// Next.js 14 requires awaiting params for dynamic route handlers
	const { slug } = await params;
	const { searchParams } = new URL(req.url);
	const limit = Number(searchParams.get("limit") ?? "100");
	const offset = Number(searchParams.get("offset") ?? "0");
	const sortBy =
		(searchParams.get("sortBy") as "updated" | "created") || "updated";

	if (!slug) {
		return NextResponse.json({ error: "Missing slug" }, { status: 400 });
	}

	try {
		const supabase = await createClient();

		// Handle special "default" slug
		let note: { id: string } | null = null;

		if (slug === "default") {
			// Get user's default note by is_default_note flag
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
			}

			const { data: defaultNote, error: noteError } = await supabase
				.from("notes")
				.select("id")
				.eq("owner_id", user.id)
				.eq("is_default_note", true)
				.maybeSingle();

			if (noteError || !defaultNote) {
				return NextResponse.json(
					{ error: "Default note not found" },
					{ status: 404 },
				);
			}

			note = defaultNote;
		} else {
			// Fetch note ID by slug
			const { data: noteData, error: noteError } = await supabase
				.from("notes")
				.select("id")
				.eq("slug", slug)
				.single();

			if (noteError || !noteData) {
				return NextResponse.json({ error: "Note not found" }, { status: 404 });
			}

			note = noteData;
		}

		// Fetch pages via RPC
		const { data: rpcData, error: rpcError } = await supabase.rpc(
			"get_note_pages",
			{
				p_note_id: note.id,
				p_limit: limit,
				p_offset: offset,
				p_sort: sortBy,
			},
		);

		if (rpcError) {
			return NextResponse.json({ error: rpcError.message }, { status: 500 });
		}

		const pages = (rpcData?.[0]?.pages ??
			[]) as Database["public"]["Tables"]["pages"]["Row"][];
		const totalCount = rpcData?.[0]?.total_count ?? 0;

		return NextResponse.json({ pages, totalCount });
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
