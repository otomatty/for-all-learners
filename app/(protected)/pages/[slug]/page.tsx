import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import EditPageForm from "./_components/edit-page-form";
import { getPagesByUser, getSharedPagesByUser } from "@/app/_actions/pages";
import { BackLink } from "@/components/ui/back-link";
import { Container } from "@/components/container";

// Add imports for page link transformation and content viewer
import type { JSONContent } from "@tiptap/core";
import { transformPageLinks } from "@/lib/utils/transformPageLinks";

export default async function PageDetail({
	params,
}: { params: Promise<{ slug: string }> }) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		redirect("/auth/login");
	}

	// Await params for Next.js 14 sync dynamic APIs
	const { slug: rawSlug } = await params;
	const slug = decodeURIComponent(rawSlug);
	// Fetch by ID or title
	const { data: page, error } = await supabase
		.from("pages")
		.select("*")
		.or(`id.eq.${slug},title.eq.${slug}`)
		.single();
	if (error) throw error;
	if (!page) {
		notFound();
	}

	// Fetch pages and shared pages for mapping titles to IDs
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
				userId={user.id}
				initialContent={decoratedDoc}
			/>
		</Container>
	);
}
