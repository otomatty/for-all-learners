import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { type NextRequest, NextResponse } from "next/server";
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

	// Insert a blank page with default Tiptap doc
	const defaultContent = {
		type: "doc",
		content: [],
	} as unknown as Database["public"]["Tables"]["pages"]["Row"]["content_tiptap"];
	const { data, error } = await supabase
		.from("pages")
		.insert({
			user_id: user.id,
			title: "",
			content_tiptap: defaultContent,
			is_public: false,
		})
		.select("id")
		.single();

	if (error) {
		console.error("New page creation error:", error);
		throw error;
	}

	// Redirect to the newly created page (using ID as temporary slug)
	return NextResponse.redirect(
		new URL(`/pages/${encodeURIComponent(data.id)}`, req.url),
	);
}
