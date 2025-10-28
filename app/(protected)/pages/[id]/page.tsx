import type { JSONContent } from "@tiptap/core";
import { notFound, redirect } from "next/navigation";
import { getLinkGroupsForPage } from "@/app/_actions/linkGroups";
import { getPagesByUser, getSharedPagesByUser } from "@/app/_actions/pages";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { transformPageLinks } from "@/lib/utils/transformPageLinks";

import EditPageForm from "./_components/EditPageForm";

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
	const { data: relation } = await supabase
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
		allPages.map((p) => [p.title, p.id]),
	);

	// Transform page content to embed pageId in pageLink marks
	const decoratedDoc = transformPageLinks(
		page.content_tiptap as JSONContent,
		pagesMap,
	);

	// Sync bracketed links on each page load (insert new links only)
	function extractBracketedNames(doc: JSONContent): string[] {
		const names = new Set<string>();
		function recurse(node: unknown): void {
			if (typeof node === "object" && node !== null) {
				const n = node as { text?: string; content?: unknown[] };
				if (typeof n.text === "string") {
					for (const m of n.text.matchAll(/\[([^[\]]+)\]/g)) {
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
		page.content_tiptap as JSONContent,
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

	// --- ページ読み込み時にリンクグループを同期（既存ページ対応） ---
	const { syncLinkGroupsForPage } = await import(
		"@/app/_actions/syncLinkGroups"
	);
	await syncLinkGroupsForPage(page.id, page.content_tiptap as JSONContent);

	// --- リンクグループデータの取得（新規） ---
	const { data: linkGroups } = await getLinkGroupsForPage(page.id);

	// missingLinks から linkCount > 1 のグループを除外
	const missingLinksFiltered = missingLinks.filter((linkText) => {
		// linkGroups の displayText と一致するものを除外
		const isInGroup = linkGroups?.some(
			(group) => group.displayText === linkText,
		);
		return !isInGroup;
	});

	return (
		<Container>
			<BackLink title="ページ一覧に戻る" path="/pages" />
			<div className="flex gap-4">
				<div className="flex-1">
					<EditPageForm
						page={page}
						initialContent={decoratedDoc}
						cosenseProjectName={cosenseProjectName}
						missingLinks={missingLinksFiltered}
						linkGroups={linkGroups || []}
					/>
				</div>
			</div>
		</Container>
	);
}
