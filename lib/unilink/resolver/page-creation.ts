/**
 * Page Creation
 * Handles all page creation logic for UnifiedLinkMark
 */

import { createPage } from "@/app/_actions/pages";
import { toast } from "sonner";
import type { Editor } from "@tiptap/core";
import { updateMarkToExists } from "./mark-operations";
import { notifyPageCreated } from "./broadcast";
import { normalizeTitleToKey } from "../utils";

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
  noteSlug?: string
): Promise<string | null> {
  try {
    console.log(`[UnifiedResolver] Creating page: "${title}"`);

    // User ID is required but we need to consider how to obtain it from current context
    // Temporarily throw error if userId is not available from editor context
    if (!userId) {
      throw new Error("User ID is required for page creation");
    }

    // Create page via Server Action
    const newPage = await createPage({
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
      user_id: userId,
      is_public: false, // Default to private
    });

    // TODO: If noteSlug is provided, associate with note_pages table
    // if (noteSlug && newPage?.id) {
    //   await associatePageWithNote(newPage.id, noteSlug);
    // }

    if (newPage?.id) {
      console.log(`[UnifiedResolver] Page created with ID: ${newPage.id}`);

      // Update mark to exists state
      await updateMarkToExists(editor, markId, newPage.id, title);

      // P3: Notify other tabs via BroadcastChannel
      const key = normalizeTitleToKey(title);
      notifyPageCreated(key, newPage.id);

      toast.success(`ページ「${title}」を作成しました`);
      return newPage.id;
    }

    throw new Error("Page creation returned no ID");
  } catch (error) {
    console.error("Page creation failed:", error);
    toast.error(`ページ「${title}」の作成に失敗しました`);
    return null;
  }
}

/**
 * Create a new page from DOM click handler
 * Called from <a> tags with data-page-title attribute
 *
 * @param title Page title to create
 * @param userId User ID (authenticated user)
 * @param noteSlug Optional note slug (for note_page_links table association)
 * @returns Created page ID and href, or null on failure
 */
export async function createPageFromLink(
  title: string,
  userId: string,
  noteSlug?: string | null
): Promise<{ pageId: string; href: string } | null> {
  try {
    console.log(`[UnifiedResolver] Creating page from link: "${title}"`);

    // Convert underscores to spaces for page title
    const titleWithSpaces = title.replace(/_/g, " ");

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
      console.error("Page creation failed:", insertError);
      toast.error("ページ作成に失敗しました");
      return null;
    }

    console.log(
      `[UnifiedResolver] Page created from link with ID: ${newPage.id}`
    );

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
          console.error("Failed to link page to note:", linkError);
          // Even on error, page creation succeeded so continue
        } else {
          console.log(
            `[UnifiedResolver] Page linked to note: noteId=${note.id}, pageId=${newPage.id}`
          );
        }
      }
    }

    // 3. Generate URL
    const href = noteSlug
      ? `/notes/${encodeURIComponent(noteSlug)}/${newPage.id}?newPage=true`
      : `/pages/${newPage.id}?newPage=true`;

    // 4. Notify other tabs via BroadcastChannel
    const key = normalizeTitleToKey(titleWithSpaces);
    notifyPageCreated(key, newPage.id);

    toast.success(`ページ「${titleWithSpaces}」を作成しました`);

    return { pageId: newPage.id, href };
  } catch (error) {
    console.error("[UnifiedResolver] Page creation from link failed:", error);
    toast.error(
      `ページ作成中にエラーが発生しました: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}
