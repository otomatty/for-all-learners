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
	let page = pageData;

	// Auto sync detailed content if list-synced but content not yet synced
	if (
		page.scrapbox_page_list_synced_at &&
		!page.scrapbox_page_content_synced_at
	) {
		// fetch user's Cosense projectName relation
		const { data: relation, error: relError } = await supabase
			.from("user_cosense_projects")
			.select("cosense_projects(project_name)")
			.eq("user_id", user.id)
			.limit(1)
			.single();
		if (relError || !relation) {
			console.error(
				"Cosense project relation not found for detailed sync",
				relError,
			);
		} else {
			const projectName = relation.cosense_projects.project_name;
			// Construct absolute URL for server fetch
			const hdrs = await headers();
			const host = hdrs.get("host") || "";
			const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
			const origin = `${protocol}://${host}`;
			const url = new URL(
				`/api/cosense/sync/page/${encodeURIComponent(
					projectName,
				)}/${encodeURIComponent(page.title)}`,
				origin,
			).toString();
			// include cookies for server-side auth
			const cookieHeader = hdrs.get("cookie") || "";
			console.log("[Cosense Debug] cookie header=", cookieHeader);
			console.log("[Cosense Debug] Absolute Sync URL=", url);
			try {
				const res = await fetch(url, {
					cache: "no-store",
					headers: { cookie: cookieHeader },
				});
				console.log("[Cosense Debug] fetch status=", res.status, "ok=", res.ok);
				console.log(
					"[Cosense Debug] content-type=",
					res.headers.get("content-type"),
				);
				const text = await res.text();
				console.log("[Cosense Debug] response body=", text);
				let data: unknown;
				try {
					data = JSON.parse(text);
					console.log("[Cosense Debug] parsed JSON=", data);
				} catch (e) {
					console.log("[Cosense Debug] JSON parse failed=", e);
				}
				// re-fetch page with full content
				const { data: updatedPage } = await supabase
					.from("pages")
					.select("*")
					.eq("id", page.id)
					.single();
				if (updatedPage) {
					page = updatedPage;
					console.log("[Cosense Debug] updatedPage object:", updatedPage);
				}
			} catch (err) {
				console.error("Cosense content sync error:", err);
			}
		}
	}

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
	console.log("[Cosense Debug] decoratedDoc:", decoratedDoc);

	return (
		<Container className="max-w-5xl">
			<BackLink title="戻る" className="mb-4" path="/pages" />
			<EditPageForm page={page} initialContent={decoratedDoc} />
		</Container>
	);
}
