import { getPagesByUser, getSharedPagesByUser } from "@/app/_actions/pages";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { transformPageLinks } from "@/lib/utils/transformPageLinks";
// Add imports for page link transformation and content viewer
import type { JSONContent } from "@tiptap/core";
import EditPageForm from "./_components/edit-page-form";

export default async function PageDetail({
	params,
}: { params: Promise<{ id: string }> }) {
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
		allPages.map((p) => [p.title, p.id]),
	);

	// Transform page content to embed pageId in pageLink marks
	const decoratedDoc = transformPageLinks(
		page.content_tiptap as JSONContent,
		pagesMap,
	);

	return (
		<Container className="max-w-5xl">
			<BackLink title="戻る" className="mb-4" path="/pages" />
			<EditPageForm
				page={page}
				initialContent={decoratedDoc}
				cosenseProjectName={cosenseProjectName}
			/>
		</Container>
	);
}
