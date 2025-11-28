"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export function NewPageClient() {
	const router = useRouter();
	const params = useParams();
	const slug = params?.slug as string | undefined;
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!slug) {
			setError("Note slug is required");
			setIsLoading(false);
			return;
		}

		const createNewPage = async () => {
			try {
				const supabase = createClient();

				// Check authentication
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();
				if (userError || !user) {
					router.push("/auth/login");
					return;
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
				router.push(
					`/notes/${encodeURIComponent(slug)}/${encodeURIComponent(page.id)}`,
				);
			} catch (err) {
				logger.error({ error: err }, "Failed to create new page");
				setError(
					err instanceof Error ? err.message : "Failed to create new page",
				);
				setIsLoading(false);
			}
		};

		createNewPage();
	}, [slug, router]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">ページを作成中...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-destructive">{error}</div>
			</div>
		);
	}

	return null;
}
