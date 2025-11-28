"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export function DefaultNewPageClient() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
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
								description:
									"ユーザーが作成したすべてのページを含むデフォルトノート",
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
				const { error: linkError } = await supabase
					.from("note_page_links")
					.insert({
						note_id: defaultNoteId,
						page_id: page.id,
					});

				if (linkError) {
					throw linkError;
				}

				// Redirect to the newly created page (using ID as temporary slug)
				router.push(`/notes/default/${encodeURIComponent(page.id)}`);
			} catch (err) {
				logger.error({ error: err }, "Failed to create new default page");
				setError(
					err instanceof Error ? err.message : "Failed to create new page",
				);
				setIsLoading(false);
			}
		};

		createNewPage();
	}, [router]);

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
