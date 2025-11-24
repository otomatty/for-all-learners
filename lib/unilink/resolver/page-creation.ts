/**
 * Page Creation
 * Handles all page creation logic for UnifiedLinkMark
 */

import type { Editor } from "@tiptap/core";
import { toast } from "sonner";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import { normalizeTitleToKey } from "../utils";
import { notifyPageCreated } from "./broadcast";
import { updateMarkToExists } from "./mark-operations";

/**
 * Create a page from a missing mark
 * Page creation flow within TipTap Editor
 *
 * @param editor TipTap editor instance
 * @param markId Target mark ID
 * @param title Page title to create
 * @param userId User ID (for future permission checks)
 * @param noteSlug Optional note slug (for note_pages table association)
 * @returns Created page ID, or null on failure
 */
export async function createPageFromMark(
	editor: Editor,
	markId: string,
	title: string,
	userId?: string,
): Promise<string | null> {
	try {
		// User ID is required but we need to consider how to obtain it from current context
		// Temporarily throw error if userId is not available from editor context
		if (!userId) {
			throw new Error("User ID is required for page creation");
		}

		// Create page directly using Supabase client
		const supabase = createClient();
		const { data: newPage, error: insertError } = await supabase
			.from("pages")
			.insert({
				user_id: userId,
				title,
				content_tiptap: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: `# ${title}\n\n新しいページです。`,
								},
							],
						},
					],
				},
				is_public: false, // Default to private
			})
			.select("id")
			.single();

		if (insertError || !newPage) {
			throw insertError || new Error("Page creation returned no ID");
		}

		// TODO: If noteSlug is provided, associate with note_pages table
		// if (noteSlug && newPage?.id) {
		//   await associatePageWithNote(newPage.id, noteSlug);
		// }

		if (newPage?.id) {
			// Update mark to exists state
			await updateMarkToExists(editor, markId, newPage.id);

			// P3: Notify other tabs via BroadcastChannel
			const key = normalizeTitleToKey(title);
			notifyPageCreated(key, newPage.id);

			toast.success(`ページ「${title}」を作成しました`);
			return newPage.id;
		}

		throw new Error("Page creation returned no ID");
	} catch (error) {
		logger.error({ markId, title, userId, error }, "Page creation failed");
		toast.error(`ページ「${title}」の作成に失敗しました`);
		return null;
	}
}

/**
 * Create a new page from DOM click handler
 * Called from <a> tags with data-page-title attribute
 *
 * @param title Page title to create (may contain Japanese, spaces, etc.)
 * @param userId User ID (authenticated user)
 * @param noteSlug Optional note slug (for note_page_links table association)
 * @returns Created page ID and href, or null on failure
 */
export async function createPageFromLink(
	title: string,
	userId: string,
	noteSlug?: string | null,
): Promise<{ pageId: string; href: string } | null> {
	try {
		// Convert underscores to spaces for page title
		// This allows users to write titles like "My_Page" which becomes "My Page"
		const titleWithSpaces = title.replace(/_/g, " ");

		// Validate title
		if (!titleWithSpaces.trim()) {
			logger.error({ title }, "Empty title provided for page creation");
			toast.error("ページタイトルを入力してください");
			return null;
		}

		// Dynamic import to avoid circular dependency
		const { createClient } = await import("@/lib/supabase/client");
		const supabase = createClient();

		// 1. Create page
		const { data: newPage, error: insertError } = await supabase
			.from("pages")
			.insert({
				user_id: userId,
				title: titleWithSpaces,
				content_tiptap: { type: "doc", content: [] },
				is_public: false,
			})
			.select("id")
			.single();

		if (insertError || !newPage) {
			logger.error(
				{ title: titleWithSpaces, userId, error: insertError },
				"Page creation failed",
			);
			toast.error("ページ作成に失敗しました");
			return null;
		}

		// 2. If noteSlug exists, associate with note_page_links
		if (noteSlug) {
			const { data: note, error: noteError } = await supabase
				.from("notes")
				.select("id")
				.eq("slug", noteSlug)
				.single();

			if (!noteError && note) {
				const { error: linkError } = await supabase
					.from("note_page_links")
					.insert({ note_id: note.id, page_id: newPage.id });

				if (linkError) {
					logger.error(
						{ noteId: note.id, pageId: newPage.id, error: linkError },
						"Failed to link page to note",
					);
					// Even on error, page creation succeeded so continue
				}
			}
		}

		// 3. Generate URL
		const href = noteSlug
			? `/notes/${encodeURIComponent(noteSlug)}/${newPage.id}?newPage=true`
			: `/notes/default/${newPage.id}?newPage=true`;

		// 4. Notify other tabs via BroadcastChannel
		const key = normalizeTitleToKey(titleWithSpaces);
		notifyPageCreated(key, newPage.id);

		toast.success(`ページ「${titleWithSpaces}」を作成しました`);

		return { pageId: newPage.id, href };
	} catch (error) {
		logger.error(
			{ title, userId, noteSlug, error },
			"[UnifiedResolver] Page creation from link failed",
		);
		toast.error(
			`ページ作成中にエラーが発生しました: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		return null;
	}
}
