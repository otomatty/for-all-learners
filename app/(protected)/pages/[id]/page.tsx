import { getPagesByUser, getSharedPagesByUser } from "@/app/_actions/pages";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

import { extractLinkData } from "@/lib/utils/linkUtils";
import { transformPageLinks } from "@/lib/utils/transformPageLinks";
import type { JSONContent } from "@tiptap/core";

import EditPageForm from "./_components/edit-page-form";

export default async function PageDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // Await params for Next.js 14 sync dynamic APIs
  const { id: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  // Fetch by ID or title
  const { data: pageData, error } = await supabase
    .from("pages")
    .select("*")
    .or(`id.eq.${slug},title.eq.${slug}`)
    .single();
  if (error) throw error;
  if (!pageData) {
    notFound();
  }
  // Use mutable page for potential re-fetch after content sync
  const page = pageData;

  // Fetch user's Cosense projectName for manual sync
  const { data: relation, error: relError } = await supabase
    .from("user_cosense_projects")
    .select("cosense_projects(project_name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  const cosenseProjectName = relation?.cosense_projects.project_name ?? null;

  // Fetch pages and shared pages for mapping titles to IDs (after potential content sync)
  const [myPages, sharedPageShares] = await Promise.all([
    getPagesByUser(user.id),
    getSharedPagesByUser(user.id),
  ]);
  const sharedPages = sharedPageShares.map((share) => share.pages);
  const allPages = [...(myPages?.pages ?? []), ...(sharedPages ?? [])];
  const pagesMap = new Map<string, string>(
    allPages.map((p) => [p.title, p.id])
  );

  // Transform page content to embed pageId in pageLink marks
  const decoratedDoc = transformPageLinks(
    page.content_tiptap as JSONContent,
    pagesMap
  );

  // Sync bracketed links on each page load (insert new links only)
  function extractBracketedNames(doc: JSONContent): string[] {
    const names = new Set<string>();
    function recurse(node: unknown): void {
      if (typeof node === "object" && node !== null) {
        const n = node as { text?: string; content?: unknown[] };
        if (typeof n.text === "string") {
          for (const m of n.text.matchAll(/\[([^\[\]]+)\]/g)) {
            names.add(m[1]);
          }
        }
        if (Array.isArray(n.content)) {
          for (const child of n.content) {
            recurse(child);
          }
        }
      }
    }
    recurse(doc);
    return Array.from(names);
  }
  const bracketedNames = extractBracketedNames(
    page.content_tiptap as JSONContent
  );
  // Fetch pages for bracketed titles not in pagesMap
  const missingTitles = bracketedNames.filter((name) => !pagesMap.has(name));
  if (missingTitles.length > 0) {
    const { data: fetchedPages, error: fetchPagesError } = await supabase
      .from("pages")
      .select("id, title")
      .in("title", missingTitles);
    if (fetchPagesError) throw fetchPagesError;
    for (const p of fetchedPages) {
      pagesMap.set(p.title, p.id);
    }
  }
  const outgoingBracketIds: string[] = [];
  const missingBracketNames: string[] = [];
  for (const name of bracketedNames) {
    const id = pagesMap.get(name);
    if (id) outgoingBracketIds.push(id);
    else missingBracketNames.push(name);
  }
  const missingLinks = missingBracketNames;

  // --- このページがリンクしているページ一覧をDBから取得 ---
  const { data: outRecs, error: outErr } = await supabase
    .from("page_page_links")
    .select("linked_id")
    .eq("page_id", page.id);
  if (outErr) throw outErr;
  const outgoingIds = outRecs.map((r) => r.linked_id);
  const { data: outgoingPages, error: fetchErr } = await supabase
    .from("pages")
    .select("id, title, content_tiptap, thumbnail_url")
    .in("id", outgoingIds as string[]);
  if (fetchErr) throw fetchErr;

  // Compute nestedLinks for each outgoing page
  const nestedLinks: Record<string, string[]> = {};
  for (const p of outgoingPages) {
    nestedLinks[p.id] = extractLinkData(
      p.content_tiptap as JSONContent
    ).outgoingIds;
  }

  // --- このページを参照しているページ（被リンク）をDBから取得 ---
  const { data: inRecs, error: inErr } = await supabase
    .from("page_page_links")
    .select("page_id")
    .eq("linked_id", page.id);
  if (inErr) throw inErr;
  const incomingIds = inRecs.map((r) => r.page_id);
  let incomingPages: Array<{
    id: string;
    title: string;
    content_tiptap: JSONContent;
    thumbnail_url: string | null;
  }> = [];
  if (incomingIds.length > 0) {
    const { data: fetchedIncomingPages, error: incomingErr } = await supabase
      .from("pages")
      .select("id, title, content_tiptap, thumbnail_url")
      .in("id", incomingIds as string[]);
    if (incomingErr) throw incomingErr;
    incomingPages = fetchedIncomingPages.map((p) => ({
      ...p,
      content_tiptap: p.content_tiptap as JSONContent,
      thumbnail_url: p.thumbnail_url ?? null,
    }));
  }

  return (
    <Container>
      <BackLink title="ページ一覧に戻る" path="/pages" />
      <div className="flex gap-4">
        <div className="flex-1">
          <EditPageForm
            page={page}
            initialContent={decoratedDoc}
            cosenseProjectName={cosenseProjectName}
            outgoingPages={outgoingPages.map((p) => ({
              id: p.id,
              title: p.title,
              thumbnail_url: p.thumbnail_url ?? null,
              content_tiptap: p.content_tiptap as JSONContent,
            }))}
            incomingPages={incomingPages}
            missingLinks={missingLinks}
            nestedLinks={nestedLinks}
          />
        </div>
      </div>
    </Container>
  );
}
